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
    // 4. HELPER: PARSE TEXT (Extracts Markdown Image)
    // ------------------------------------------------------------
    private parseStoryText(text: string, transcript: string): Story {
        // 1. Extract Title
        const titleMatch = text.match(/^Title[:.]?\s*(.+)$/im);
        const title = titleMatch ? titleMatch[1].trim() : 'New Story';

        let body = text.replace(/^Title[:.]?.+$/im, '').trim();

        // ---------------------------------------------------------
        // 2. EXTRACT COVER IMAGE (The New Part)
        // ---------------------------------------------------------
        let coverImageUrl: string | null = null;

        // Regex explanation:
        // !\[.*?\]  -> Matches ![alt text]
        // \(        -> Opening parenthesis
        // \s* -> Optional whitespace
        // (https?://[^)]+) -> CAPTURE GROUP: The actual URL
        // \s* -> Optional whitespace
        // \)        -> Closing parenthesis
        const imageRegex = /!\[.*?\]\(\s*(https?:\/\/[^)]+)\s*\)/i;
        const imageMatch = body.match(imageRegex);

        if (imageMatch && imageMatch[1]) {
            coverImageUrl = imageMatch[1].trim(); // Save the URL
            body = body.replace(imageRegex, '').trim(); // Remove the tag from text
            console.log('coverImageUrl: ' + coverImageUrl);
        }

        // ---------------------------------------------------------
        // 3. SPLIT PAGES (Standard Logic)
        // ---------------------------------------------------------
        // Split by "Page X" or "---PAGE BREAK---"
        const splitRegex = /(?:---|Page)\s*(?:PAGE BREAK|Page)\s*\d+[:.]?/i;
        const rawChunks = body.split(splitRegex);

        const pages: StoryPage[] = [];

        rawChunks.forEach((chunk, index) => {
            const trimmedChunk = chunk.trim();
            if (trimmedChunk.length < 20) return;

            // Clean up content
            const cleanContent = trimmedChunk
                .replace(/Illustration[:.]?.+/gi, '')
                .replace(/---PAGE BREAK---/gi, '')
                .trim();

            if (cleanContent.length > 0) {
                const pageNum = pages.length + 1;

                // LOGIC: Use the Real AI Image for Page 1, fallback to placeholder for others
                let finalImageUrl = null;

                if (pageNum === 1 && coverImageUrl) {
                    finalImageUrl = coverImageUrl; // ✅ USE REAL AI IMAGE
                    console.log('finalImageUrl:' + finalImageUrl);
                } else {
                    // (Optional) Keep using Picsum for other pages if you want
                    // finalImageUrl = `https://picsum.photos/seed/${100 + pageNum}/800/600`;
                    finalImageUrl = null; // Or just have text only
                }

                pages.push({
                    pageNumber: pageNum,
                    content: cleanContent,
                    illustrationPrompt: "Cover Art",
                    imageUrl: finalImageUrl
                });
            }
        });

        // Fallback if parsing failed
        if (pages.length === 0) {
            pages.push({
                pageNumber: 1,
                content: body,
                illustrationPrompt: "Story",
                imageUrl: coverImageUrl // Ensure image is attached even if pagination fails
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