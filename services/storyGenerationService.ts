import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Story, StoryPage, StoryGenerationResult } from '../types/story';

// 1. Dynamic Base URL
// Use localhost for iOS simulator, but allow overrides for physical devices
// const API_BASE_URL = Constants.expoConfig?.hostUri
//     ? `http://${Constants.expoConfig.hostUri.split(':').shift()}:8000`
//     : 'http://127.0.0.1:8000';

const API_BASE_URL = 'http://127.0.0.1:8000';

class StoryGenerationService {

    // ------------------------------------------------------------
    // 1. AUTH HELPER (Centralized)
    // ------------------------------------------------------------
    private async getAuthToken(): Promise<string | null> {
        if (Platform.OS === 'web') {
            return localStorage.getItem('userToken');
        }
        return await SecureStore.getItemAsync('userToken');
    }

    // ------------------------------------------------------------
    // 2. API CLIENT (Handles Headers & Errors)
    // ------------------------------------------------------------
    private async postToApi<T>(endpoint: string, body: any): Promise<T> {
        const token = await this.getAuthToken();

        if (!token) {
            throw new Error("Unauthorized: Please log in to generate stories.");
        }

        console.log(`🚀 POST ${API_BASE_URL}${endpoint}`);

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}` // <--- Token attached automatically
                },
                body: JSON.stringify(body),
            });

            const json = await response.json();

            if (!response.ok) {
                // Handle Laravel Validation Errors (422) or Auth Errors (401)
                const errorMessage = json.message || json.error || `HTTP ${response.status}`;
                throw new Error(errorMessage);
            }

            // Laravel usually returns { data: { story: "..." } }
            // We normalize it here so the rest of the app gets clean data
            return json.data || json;

        } catch (error: any) {
            console.error("❌ API Request Failed:", error);
            throw error; // Re-throw so the UI knows it failed
        }
    }

    // ------------------------------------------------------------
    // 3. MAIN FUNCTION: GENERATE STORY
    // ------------------------------------------------------------
    async generateStory(transcript: string): Promise<StoryGenerationResult> {
        if (!transcript?.trim()) {
            return this.failResponse("Transcript is empty", transcript);
        }

        try {
            // A. PREPARE PROMPT
            // We wrap the user's transcript in your template before sending it
            const promptTemplate = `
                You are a children's book author. Write a 5-page story based on this conversation.
                Each page should have 2-3 sentences and vivid illustration details.
                
                Conversation:
                ${transcript}
            `;

            // B. CALL LARAVEL API
            const response = await this.postToApi<any>('/api/stories/generate', {
                transcript: promptTemplate,
                options: { maxTokens: 1000, temperature: 0.7 }
            });

            // C. EXTRACT TEXT
            // Handle different JSON shapes (just in case)
            const rawText = response.story || response?.data?.story || response;

            if (typeof rawText !== 'string') {
                throw new Error("Invalid response format from AI");
            }

            // D. PARSE INTO OBJECT
            const story = this.parseStoryText(rawText, transcript);

            return { success: true, story };

        } catch (error: any) {
            return this.failResponse(error.message, transcript);
        }
    }

    // ------------------------------------------------------------
    // 4. HELPER: PARSE TEXT TO STORY OBJECT
    // ------------------------------------------------------------
    private parseStoryText(text: string, transcript: string): Story {
        // Extract Title (assumes "Title: Some Title" format)
        const titleMatch = text.match(/^Title[:.]?\s*(.+)$/im);
        const title = titleMatch ? titleMatch[1].trim() : 'New Story';

        // Clean up the text
        const cleanBody = text
            .replace(/^Title[:.]?.+$/im, '') // Remove title line
            .replace(/Page\s*\d+[:.]?/gi, '') // Remove "Page 1" labels
            .trim();

        // Single Page Structure (as requested in your previous code)
        const pages: StoryPage[] = [{
            pageNumber: 1,
            content: cleanBody,
            illustrationPrompt: "Illustration of the story"
        }];

        return {
            id: `story_${Date.now()}`,
            title,
            pages,
            transcript,
            createdAt: new Date(),
        };
    }

    // ------------------------------------------------------------
    // 5. HELPER: CREATE FAILURE OBJECT
    // ------------------------------------------------------------
    private failResponse(errorMsg: string, transcript: string): StoryGenerationResult {
        return {
            success: false,
            error: errorMsg,
            story: {
                id: 'error',
                title: 'Generation Failed',
                pages: [],
                transcript,
                createdAt: new Date(),
            }
        };
    }
}

export default new StoryGenerationService();