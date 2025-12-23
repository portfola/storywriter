import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Story, StoryPage, StoryGenerationResult } from '../types/story';

// 1. Dynamic Base URL
const API_BASE_URL = __DEV__
    ? 'http://127.0.0.1:8000'              // Used during development
    : 'https://api.storywriter.net';       // Used in production build


interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}


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
            console.log('The returned output: ' + json.data.story);
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
                                You are a professional children's book author. Your goal is 
                to take a transcript of a conversation and turn it into 
                an engaging 3 to 6 page story for young readers.

                **Task Instructions**
                1. Read the supplied [Conversation] to understand the characters, plot ideas, and tone.
                2. Write a 3 to 6 page story based on this input.

                **Formatting Requirements (CRITICAL):**
                You must strictly follow this structure. 
                If you do not follow this exact format, the output is unusable.

                * The story MUST be at least 3 pages long, but could go to 10 pages.
                * You MUST separate every page using exactly 
                * this separator line: "-- - PAGE BREAK--- "


                **Desired Output Structure Example:**

                Page 1
                [The text for the first page of the story goes here...]
                ---PAGE BREAK---

                Page 2
                [The text for the second page goes here...]
                ---PAGE BREAK---
                *(Continue this exact pattern for Pages 3, 4, and 5)*

                **[Conversation]:**
                [FULL_DIALOGUE]
                
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
    // 4. HELPER: PARSE TEXT (Fixed for "Page 1" with no colon)
    // ------------------------------------------------------------
    private parseStoryText(text: string, transcript: string): Story {
        // 1. Extract Title
        const titleMatch = text.match(/^Title[:.]?\s*(.+)$/im);
        const title = titleMatch ? titleMatch[1].trim() : 'My Xmas Story';

        // 2. Clean Body (Remove Title)
        let body = text.replace(/^Title[:.]?.+$/im, '').trim();

        // 3. SPLIT BY "Page X" (Robust Regex)
        // \bPage ensures we don't split words like "RamPagers"
        // \s*\d+ matches the number
        // [:.]? matches an optional colon or dot
        // This splits "Page 1", "Page 1:", "Page 1.", and "---PAGE BREAK---" if present
        const splitRegex = /(?:---|Page)\s*(?:PAGE BREAK|Page)\s*\d+[:.]?/i;

        const rawChunks = body.split(splitRegex);

        const pages: StoryPage[] = [];

        rawChunks.forEach((chunk, index) => {
            const trimmedChunk = chunk.trim();

            // Clean Content
            const cleanContent = trimmedChunk
                .replace(/--PAGE BREAK/gi, '')    // <--- NEW: Remove the artifact
                .replace(/Page\s*\d+[:.]?/gi, '')     // Remove "Page X"
                .trim();

            if (trimmedChunk.length < 20) return; // Skip empty preamble

            // --- EXTRACT ILLUSTRATION ---
            // (Your current output doesn't have illustrations, but we keep this logic just in case)
            const parts = cleanContent.split(/Illustration[:.]/i);
            const storyText = parts[0].trim();
            const illustrationDesc = parts.length > 1 ? parts[1].trim() : "Magical scene";


            if (storyText.length > 0) {
                const pageNum = pages.length + 1;

                // 🎄 XMAS DEMO IMAGES
                // Random image based on page number
                const imageId = 100 + pageNum;
                const realImageUrl = `https://picsum.photos/seed/${imageId}/800/600`;

                pages.push({
                    pageNumber: pageNum,
                    content: storyText,
                    illustrationPrompt: illustrationDesc,
                    //imageUrl: realImageUrl
                });
            }
        });

        // 4. FALLBACK (If regex still failed)
        // If we still have 0 pages, force a split by double newlines
        if (pages.length === 0) {
            const paragraphs = body.split(/\n\s*\n/);
            // ... (Simple paragraph chunking logic could go here) ...
            // But let's just create one page so it's not empty
            pages.push({
                pageNumber: 1,
                content: body,
                illustrationPrompt: "Story",
                imageUrl: `https://picsum.photos/seed/999/800/600`
            });
        }

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