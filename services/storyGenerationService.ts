import Constants from 'expo-constants';
import { Story, StoryPage, StoryGenerationResult, StoryGenerationOptions } from '../types/story';
import { storyLogger } from '@/src/utils/logger';

const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

interface BackendStoryPage {
  page_number: number;
  content: string;
  illustration_prompt: string;
}

interface BackendStoryResponse {
  id: number;
  title: string;
  pages: BackendStoryPage[];
  page_count: number;
  created_at: string;
}

class StoryGenerationService {
  private async makeApiRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for story generation
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
        ...options,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      storyLogger.error(error, { endpoint, options });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network request failed' 
      };
    }
  }

  private generateStoryId(): string {
    return `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate backend story response structure
   */
  private validateBackendStoryResponse(data: any): data is { story: BackendStoryResponse } {
    if (!data || typeof data !== 'object') {
      storyLogger.error(new Error('Invalid response: data is not an object'), { data });
      return false;
    }

    if (!data.story || typeof data.story !== 'object') {
      storyLogger.error(new Error('Invalid response: missing story object'), { data });
      return false;
    }

    const story = data.story;

    if (!story.title || typeof story.title !== 'string') {
      storyLogger.error(new Error('Invalid response: missing or invalid title'), { story });
      return false;
    }

    if (!Array.isArray(story.pages)) {
      storyLogger.error(new Error('Invalid response: pages is not an array'), { story });
      return false;
    }

    if (story.pages.length !== 5) {
      storyLogger.error(new Error(`Invalid response: expected 5 pages, got ${story.pages.length}`), { story });
      return false;
    }

    // Validate each page structure
    for (let i = 0; i < story.pages.length; i++) {
      const page = story.pages[i];
      if (!page || typeof page !== 'object') {
        storyLogger.error(new Error(`Invalid page structure at index ${i}`), { page });
        return false;
      }

      if (typeof page.page_number !== 'number' || page.page_number !== i + 1) {
        storyLogger.error(new Error(`Invalid page_number at index ${i}`), { page });
        return false;
      }

      if (!page.content || typeof page.content !== 'string') {
        storyLogger.error(new Error(`Missing or invalid content at page ${i + 1}`), { page });
        return false;
      }

      if (!page.illustration_prompt || typeof page.illustration_prompt !== 'string') {
        storyLogger.error(new Error(`Missing or invalid illustration_prompt at page ${i + 1}`), { page });
        return false;
      }
    }

    return true;
  }

  /**
   * Transform backend response to frontend Story type
   */
  private transformBackendStoryToFrontend(backendStory: BackendStoryResponse, transcript: string): Story {
    const pages: StoryPage[] = backendStory.pages.map(page => ({
      pageNumber: page.page_number,
      content: page.content,
      illustrationPrompt: page.illustration_prompt
    }));

    return {
      id: `story_${backendStory.id}`,
      title: backendStory.title,
      pages,
      createdAt: new Date(backendStory.created_at),
      transcript
    };
  }

  private async generateWithRetry(
    transcript: string,
    options: StoryGenerationOptions = {}
  ): Promise<Story> {
    const { maxRetries = 3, temperature = 0.7, maxTokens = 1000 } = options;

    storyLogger.generating({
      transcriptLength: transcript.length,
      maxRetries,
      temperature,
      maxTokens,
      backend: 'laravel'
    });

    // Make request to Laravel backend
    const requestBody = {
      transcript,
      options: {
        max_tokens: maxTokens,
        temperature,
        max_retries: maxRetries
      }
    };

    const response = await this.makeApiRequest<{ story: BackendStoryResponse }>(
      '/api/stories/generate',
      {
        method: 'POST',
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.success || !response.data) {
      const errorMessage = response.error || 'Story generation failed';
      storyLogger.error(new Error(errorMessage), { transcriptLength: transcript.length });
      throw new Error(errorMessage);
    }

    // Validate response structure
    if (!this.validateBackendStoryResponse(response.data)) {
      throw new Error('Invalid story response structure from backend');
    }

    // Transform backend response to frontend Story type
    const story = this.transformBackendStoryToFrontend(response.data.story, transcript);

    storyLogger.complete({
      backend: 'laravel',
      storyId: story.id,
      title: story.title,
      pageCount: story.pages.length
    });

    return story;
  }

  async generateStoryFromTranscript(
    transcript: string,
    options: StoryGenerationOptions = {}
  ): Promise<StoryGenerationResult> {
    if (!transcript?.trim()) {
      return {
        story: {
          id: this.generateStoryId(),
          title: "Empty Story",
          pages: [],
          createdAt: new Date()
        },
        success: false,
        error: 'Transcript is required and cannot be empty'
      };
    }

    try {
      // Call backend API which handles prompting and story generation
      const story = await this.generateWithRetry(transcript.trim(), options);

      return {
        story,
        success: true
      };
    } catch (error) {
      storyLogger.error(error, { transcript: transcript.substring(0, 100) });

      // Provide user-friendly error messages
      let errorMessage = 'Story generation failed. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('aborted')) {
          errorMessage = 'Story generation timed out. Please try again with a shorter conversation.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('Invalid story response')) {
          errorMessage = 'Generated story format is invalid. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        story: {
          id: this.generateStoryId(),
          title: "Generation Failed",
          pages: [],
          createdAt: new Date(),
          transcript
        },
        success: false,
        error: errorMessage
      };
    }
  }

  async generateStoryAutomatically(
    transcript: string, 
    options: StoryGenerationOptions = {},
    onProgress?: (message: string) => void
  ): Promise<StoryGenerationResult> {
    onProgress?.("Creating your story...");
    
    try {
      // Enhanced generation with progress updates
      const result = await this.generateStoryFromTranscript(transcript, {
        ...options,
        maxRetries: 3,
        temperature: 0.7
      });
      
      if (result.success) {
        onProgress?.("Story created successfully!");
        return result;
      } else {
        // If generation failed, try with fallback options
        onProgress?.("Trying with different settings...");
        
        const fallbackResult = await this.generateStoryFromTranscript(transcript, {
          ...options,
          maxRetries: 2,
          temperature: 0.5,
          maxTokens: 800
        });
        
        return fallbackResult;
      }
    } catch (error) {
      storyLogger.error(error, { 
        transcript: transcript.substring(0, 100),
        action: 'automatic_generation'
      });
      
      return {
        story: {
          id: this.generateStoryId(),
          title: "Generation Failed",
          pages: [],
          createdAt: new Date(),
          transcript
        },
        success: false,
        error: 'Story generation failed. Please try again.'
      };
    }
  }

  /**
   * Test connection to Laravel backend
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeApiRequest('/api/health');
      return response.success;
    } catch (error) {
      storyLogger.error(error, { action: 'test_connection' });
      return false;
    }
  }

  /**
   * Get available story generation models from backend
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await this.makeApiRequest<{ models: string[] }>('/api/stories/models');
      
      if (response.success && response.data) {
        return response.data.models;
      }
      
      // Fallback models if backend fails
      return ["openai/gpt-oss-20b"];
    } catch (error) {
      storyLogger.error(error, { action: 'get_available_models' });
      return ["openai/gpt-oss-20b"];
    }
  }
}

export default new StoryGenerationService();