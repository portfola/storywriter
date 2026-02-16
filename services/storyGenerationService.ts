import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { StoryGenerationResult } from '../types/story';

const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://127.0.0.1:8000';

class StoryGenerationService {

    // ------------------------------------------------------------
    // 1. AUTH HELPER
    // ------------------------------------------------------------
    private async getAuthToken(): Promise<string | null> {
        if (Platform.OS === 'web') {
            return localStorage.getItem('userToken');
        }
        return await SecureStore.getItemAsync('userToken');
    }

    // ------------------------------------------------------------
    // 2. API CLIENT
    // ------------------------------------------------------------
    private async postToApi<T>(endpoint: string, body: any): Promise<T> {
        const token = await this.getAuthToken();

        if (!token) {
            throw new Error('Unauthorized: Please log in to generate stories.');
        }

        console.log(`POST ${API_BASE_URL}${endpoint}`);

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        const json = await response.json();

        if (!response.ok) {
            const errorMessage = json.message || json.error || `HTTP ${response.status}`;
            throw new Error(errorMessage);
        }

        console.log('API response:', JSON.stringify(json));

        // Laravel returns data at top level now (no data wrapper)
        return json.data || json;
    }

    // ------------------------------------------------------------
    // 3. GENERATE STORY
    // ------------------------------------------------------------
    async generateStory(transcript: string): Promise<StoryGenerationResult> {
        if (!transcript?.trim()) {
            return this.failResponse('Transcript is empty');
        }

        try {
            const response = await this.postToApi<any>('/api/stories/generate', {
                transcript: transcript.trim(),
                options: { maxTokens: 2000, temperature: 0.7 },
            });

            const story = {
                title: response.title ?? '<h1>My Story</h1>',
                pages: response.pages ?? [],
                coverImage: response.cover_image ?? null,
                storyId: response.story_id ?? null,
                pageCount: response.page_count ?? 0,
            };

            if (story.pages.length === 0) {
                throw new Error('No pages returned from story generator');
            }

            console.log('Story pages count:', story.pages.length);
            console.log('Story object:', JSON.stringify(story));

            return { success: true, story };

        } catch (error: any) {
            console.error('Story generation failed:', error.message);
            return this.failResponse(error.message);
        }
    }

    // ------------------------------------------------------------
    // 4. FAIL RESPONSE
    // ------------------------------------------------------------
    private failResponse(errorMsg: string): StoryGenerationResult {
        return {
            success: false,
            error: errorMsg,
            story: {
                title: null,
                pages: [],
                coverImage: null,
                storyId: null,
                pageCount: 0,
            },
        };
    }
}

export default new StoryGenerationService();