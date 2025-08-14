import Together from 'together-ai';
import Constants from 'expo-constants';
import { Story, StoryPage, StoryGenerationResult, StoryGenerationOptions } from '../types/story';
import { storyLogger } from '@/src/utils/logger';

const TOGETHER_API_KEY = Constants.expoConfig?.extra?.TOGETHER_API_KEY;

const STORY_PROMPT_TEMPLATE = "You are a professional children's book author. Using the following conversation between a child and a story assistant, write a 5-page children's storybook. The conversation reveals the child's interests and ideas. Create an engaging story that incorporates their input naturally. Guidelines: Each page should be 2-3 sentences. Include vivid descriptions for illustrations. Maintain consistent characters. End positively. Conversation: [FULL_DIALOGUE]";

class StoryGenerationService {
  private client: Together;

  constructor() {
    if (!TOGETHER_API_KEY) {
      throw new Error('TOGETHER_API_KEY is not configured in environment variables. Please add it to your app.config.js and environment.');
    }

    this.client = new Together({
      apiKey: TOGETHER_API_KEY,
    });
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
    let lastError: Error | null = null;

    storyLogger.generating({ 
      promptLength: prompt.length,
      maxRetries,
      temperature,
      maxTokens,
      model: "openai/gpt-oss-20b"
    });

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        storyLogger.retry(attempt, { maxRetries });
        
        const response = await this.client.chat.completions.create({
          model: "openai/gpt-oss-20b",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: maxTokens,
          temperature,
        });

        storyLogger.complete({ 
          attempt,
          hasChoices: !!response.choices,
          choicesLength: response.choices?.length || 0,
          hasContent: !!response.choices?.[0]?.message?.content
        });

        const generatedText = response.choices[0]?.message?.content;
        if (!generatedText) {
          throw new Error('No content generated from API response');
        }

        return generatedText;
      } catch (error) {
        lastError = error as Error;
        storyLogger.retry(attempt, { error: error instanceof Error ? error.message : String(error) });
        
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Story generation failed after all retries');
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
}

export default new StoryGenerationService();