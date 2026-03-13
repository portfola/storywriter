export interface StoryPage {
  pageNumber: number;
  content: string;
  illustrationPrompt?: string;
  imageUrl?: string | null;
}

export interface Story {
  id: string;
  title: string;
  pages: StoryPage[];
  createdAt: Date;
  transcript?: string;
}

export interface GeneratedStory {
  title: string | null;
  pages: StoryPage[];
  coverImage: string | null;
  storyId: number | null;
  pageCount: number;
}

export interface StoryGenerationResult {
  success: boolean;
  error?: string;
  story: GeneratedStory;
}

export interface StoryGenerationOptions {
  maxRetries?: number;
  temperature?: number;
  maxTokens?: number;
}

// This represents the shape of data your BookReader actually uses
export interface StorySection {
  text: string;
  imageUrl: string | null;
  illustrationPrompt?: string | null;
}