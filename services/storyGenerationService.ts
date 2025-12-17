
import Constants from 'expo-constants';
import {
    Story,
    StoryPage,
    StoryGenerationResult,
    StoryGenerationOptions
} from '../types/story';

import { storyLogger } from '@/src/utils/logger';

import client from '@/src/api/client';



// MAKE SURE THIS CHANGES BACK BEFORE PUSHING ANYTHING LIVE
const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || 'http://127.0.0.1:8000';
//const API_BASE_URL = 'http://127.0.0.1:8000';

const STORY_PROMPT_TEMPLATE = `
You are a professional children's book author. Using the following 
conversation between a child and a story assistant, write a 5 - page 
children's storybook. Each page should be 2–3 sentences. Include vivid 
illustration details.Maintain consistent characters.End positively.

    Conversation:
[FULL_DIALOGUE]
`;

interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

class StoryGenerationService {

    // ------------------------------------------------------------
    // NETWORK LAYER
    // ------------------------------------------------------------
    private async makeApiRequest<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {

        const url = `${API_BASE_URL}${endpoint} `;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...(options.headers || {}),
                },
                signal: controller.signal,
                ...options,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                return {
                    success: false,
                    error: `HTTP ${response.status}: ${response.statusText} `,
                };
            }

            return {
                success: true,
                data: (await response.json()) as T,
            };
        } catch (error) {
            storyLogger.error(error, { endpoint, options });
            clearTimeout(timeoutId);

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Network failure',
            };
        }
    }

    // ------------------------------------------------------------
    // ID GENERATOR
    // ------------------------------------------------------------
    private generateStoryId() {
        return `story_${Date.now()}_${Math.random().toString(36).slice(2, 10)} `;
    }

    // ------------------------------------------------------------
    // RESPONSE NORMALIZATION
    // Handles ALL possible backend JSON structures
    // ------------------------------------------------------------
    private normalizeStoryResponse(raw: any): string | null {
        if (!raw) return null;

        // Common shapes
        if (typeof raw.story === 'string') return raw.story;
        if (raw.data?.story) return raw.data.story;
        if (raw.data?.data?.story) return raw.data.data.story;

        // Last-resort attempt
        const candidates = Object.values(raw).find(
            val => typeof val === 'string'
        );
        return typeof candidates === 'string' ? candidates : null;
    }

    // ------------------------------------------------------------
    // PARSING STORY INTO STRUCTURED PAGES (robust version)
    // ------------------------------------------------------------
    private parseStoryResponse(llmText: string, transcript: string): Story {
        if (!llmText || typeof llmText !== 'string') {
            throw new Error('Invalid LLM response: expected string');
        }

        const titleMatch = llmText.match(/^Title[:.]?\s*(.+)$/im);
        const title = titleMatch ? titleMatch[1].trim() : 'Untitled Story';

        // Split by paragraphs
        const paragraphs = llmText
            .split(/\n\s*\n/)
            .map(p => p.trim())
            .filter(Boolean);


        const cleaned = llmText
            .replace(/Page\s*\d+[:.]?/gi, '')   // remove Page labels
            .replace(/\n{2,}/g, '\n\n')        // normalize spacing
            .trim();


        // const pages: StoryPage[] = paragraphs.slice(0, 5).map((text, i) => ({
        //     pageNumber: i + 1,
        //     content: text,
        //     illustrationPrompt: `Child - friendly cartoon illustration of: ${text} `,
        // }));

        // // Pad to 5 pages
        // while (pages.length < 5) {
        //     pages.push({
        //         pageNumber: pages.length + 1,
        //         content: 'The story continues...',
        //         illustrationPrompt: 'Simple illustration of the ongoing scene',
        //     });
        // }

        // SINGLE-PAGE STORY (no pagination). Will restore pagination later, want to focus
        // on output first. 
        const pages: StoryPage[] = [
            {
                pageNumber: 1,
                content: cleaned.trim(),
                illustrationPrompt: `Child-friendly cartoon illustration of: whole story content`,
            }
        ];


        return {
            id: this.generateStoryId(),
            title,
            pages,
            transcript,
            createdAt: new Date(),
        };
    }

    // ------------------------------------------------------------
    // LLM REQUEST PIPELINE
    // ------------------------------------------------------------
    private async generateWithRetry(
        prompt: string,
        options: StoryGenerationOptions = {}
    ): Promise<string> {

        const { maxRetries = 3, temperature = 0.7, maxTokens = 1000 } = options;

        const requestBody = {
            transcript: prompt,
            options: { maxRetries, temperature, maxTokens },
        };

        const response = await this.makeApiRequest<any>(
            '/api/stories/generate',
            {
                method: 'POST',
                body: JSON.stringify(requestBody),
            }
        );

        // Logging for debugging live AWS server
        console.log('🟦 RAW RESPONSE', response);

        if (!response.success || !response.data) {
            throw new Error(response.error || 'Story generation failed (no payload)');
        }

        const storyText = this.normalizeStoryResponse(response.data);

        if (!storyText) {
            throw new Error(
                `Backend returned no story text.Raw: ${JSON.stringify(response.data)} `
            );
        }

        return storyText;
    }

    // ------------------------------------------------------------
    // PUBLIC METHOD: FULL PARSING + STRUCTURE
    // ------------------------------------------------------------
    async generateStoryFromTranscript(
        transcript: string,
        options: StoryGenerationOptions = {}
    ): Promise<StoryGenerationResult> {

        if (!transcript?.trim()) {
            return {
                story: {
                    id: this.generateStoryId(),
                    title: 'Empty Story',
                    pages: [],
                    transcript,
                    createdAt: new Date(),
                },
                success: false,
                error: 'Transcript is required',
            };
        }

        try {
            const prompt = STORY_PROMPT_TEMPLATE.replace(
                '[FULL_DIALOGUE]',
                transcript.trim()
            );

            const llmText = await this.generateWithRetry(prompt, options);
            const story = this.parseStoryResponse(llmText, transcript);

            return { story, success: true };
        } catch (error) {
            storyLogger.error(error);

            return {
                story: {
                    id: this.generateStoryId(),
                    title: 'Generation Failed',
                    pages: [],
                    transcript,
                    createdAt: new Date(),
                },
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    // ------------------------------------------------------------
    // PROGRESS VERSION
    // ------------------------------------------------------------
    async generateStoryAutomatically(
        transcript: string,
        options: StoryGenerationOptions = {},
        onProgress?: (msg: string) => void
    ): Promise<StoryGenerationResult> {

        onProgress?.('Creating your story...');

        const primary = await this.generateStoryFromTranscript(transcript, {
            ...options,
            temperature: 0.7,
            maxRetries: 3,
        });

        if (primary.success) {
            onProgress?.('Story created successfully!');
            return primary;
        }

        onProgress?.('Retrying with different settings...');

        return this.generateStoryFromTranscript(transcript, {
            temperature: 0.5,
            maxRetries: 2,
            maxTokens: 800,
        });
    }

    // ------------------------------------------------------------
    // HELPER ENDPOINTS
    // ------------------------------------------------------------
    async testConnection() {
        const res = await this.makeApiRequest('/api/health');
        return !!res.success;
    }

    async getAvailableModels() {
        const res = await this.makeApiRequest<{ models: string[] }>(
            '/api/stories/models'
        );

        return res.success && res.data?.models
            ? res.data.models
            : ['openai/gpt-oss-20b'];
    }
}

export default new StoryGenerationService();