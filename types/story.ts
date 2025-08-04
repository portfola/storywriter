export interface StoryPage {
  pageNumber: number;
  content: string;
  illustrationPrompt?: string;
}

export interface Story {
  id: string;
  title: string;
  pages: StoryPage[];
  createdAt: Date;
  transcript?: string;
}

export interface StoryGenerationResult {
  story: Story;
  success: boolean;
  error?: string;
}

export interface StoryGenerationOptions {
  maxRetries?: number;
  temperature?: number;
  maxTokens?: number;
}