import Constants from 'expo-constants';
import { Story, StoryPage, StoryGenerationResult, StoryGenerationOptions } from '../types/story';
import { storyLogger } from '@/src/utils/logger';

// MAKE SURE THIS CHANGES BACK BEFORE PUSHING ANYTHING LIVE
const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || 'http://127.0.0.1:8000';
//const API_BASE_URL = 'http://127.0.0.1:8000';

const STORY_PROMPT_TEMPLATE = "You are a professional children's book author. Using the following conversation between a child and a story assistant, write a 5-page children's storybook. The conversation reveals the child's interests and ideas. Create an engaging story that incorporates their input naturally. Guidelines: Each page should be 2-3 sentences. Include vivid descriptions for illustrations. Maintain consistent characters. End positively. Conversation: [FULL_DIALOGUE]";

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
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

  private parseStoryResponse(response: string, transcript: string): Story {
    const lines = response.split('\n').filter(line => line.trim());
    const pages: StoryPage[] = [];
    let currentPage = 1;
    let title = "Untitled Story";

    // Extract title if present
    const titleMatch = response.match(/(?:Title|TITLE):\s*(.+)/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    // Parse pages - look for page markers or split by paragraphs
    const pagePattern = /(?:Page|PAGE)\s*(\d+)[:.]?\s*(.+?)(?=(?:Page|PAGE)\s*\d+|$)/gis;
    const pageMatches = [...response.matchAll(pagePattern)];

    console.log("PAGE MARKERS:", pageMatches.length);
    console.log("PARAGRAPH SPLIT TEST:", response.includes("\n\n"));

    if (pageMatches.length > 0) {
      // Found explicit page markers
      pageMatches.forEach((match, index) => {
        if (index < 5) { // Limit to 5 pages
          const pageContent = match[2].trim();
          pages.push({
            pageNumber: index + 1,
            content: pageContent,
            illustrationPrompt: this.extractIllustrationPrompt(pageContent)
          });
        }
      });
    } else {
      // Split by paragraphs and take first 5
      const paragraphs = response
        .split(/\n\s*\n/)
        .filter(p => p.trim() && !p.match(/(?:Title|TITLE):/i))
        .slice(0, 5);

      paragraphs.forEach((paragraph, index) => {
        pages.push({
          pageNumber: index + 1,
          content: paragraph.trim(),
          illustrationPrompt: this.extractIllustrationPrompt(paragraph.trim())
        });
      });
    }

    // Ensure we have exactly 5 pages
    while (pages.length < 5) {
      pages.push({
        pageNumber: pages.length + 1,
        content: "The story continues...",
        illustrationPrompt: "A peaceful scene continuing the adventure"
      });
    }

    return {
      id: this.generateStoryId(),
      title,
      pages: pages.slice(0, 5),
      createdAt: new Date(),
      transcript
    };
  }

  private extractIllustrationPrompt(content: string): string {
    // Extract visual elements from the content for illustration
    const cleanContent = content.replace(/[.!?]+$/, '');
    return `Child-friendly cartoon illustration of: ${cleanContent}`;
  }

  private async generateWithRetry(
    prompt: string,
    options: StoryGenerationOptions = {}
  ): Promise<string> {
    const { maxRetries = 3, temperature = 0.7, maxTokens = 1000 } = options;

    storyLogger.generating({
      promptLength: prompt.length,
      maxRetries,
      temperature,
      maxTokens,
      backend: 'laravel'
    });

    // Make request to Laravel backend instead of direct Together AI
    const requestBody = {
      transcript: prompt,
      options: {
        maxTokens,
        temperature,
        maxRetries
      }
    };

    const response = await this.makeApiRequest<any>(
      '/api/stories/generate',
      {
        method: 'POST',
        body: JSON.stringify(requestBody),
      }
    );

    // Handle both shapes: {story: "..."} and {data: {story: "..."}}
    const raw = response.data;
    const storyText = raw?.story ?? raw?.data?.story;

    //KEEP THESE IN TEMPORARILY FOR TESTING LIVE
    console.log('RESPONSE:', response);
    console.log('RAW: ', raw);
    console.log('storyText: ', storyText);

    if (!response.success || !storyText) {
      throw new Error(response.error || 'Story generation failed at line 168');
    }

    storyLogger.complete({
      backend: 'laravel',
      hasContent: !!storyText
    });

    return storyText;
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
      const prompt = STORY_PROMPT_TEMPLATE.replace('[FULL_DIALOGUE]', transcript.trim());
      const generatedText = await this.generateWithRetry(prompt, options);
      const story = this.parseStoryResponse(generatedText, transcript);

      return {
        story,
        success: true
      };
    } catch (error) {
      storyLogger.error(error, { transcript: transcript.substring(0, 100) });

      return {
        story: {
          id: this.generateStoryId(),
          title: "Generation Failed",
          pages: [],
          createdAt: new Date(),
          transcript
        },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during story generation'
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