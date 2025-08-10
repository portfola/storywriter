/**
 * AI Services Registry
 * 
 * This file documents all available AI services in the StoryWriter app.
 * Only ElevenLabs and Together AI are currently active.
 */

// === ACTIVE SERVICES ===
export { default as ElevenLabsService } from './elevenLabsService';
export { default as StoryGenerationService } from './storyGenerationService';

// === FUTURE/ALTERNATIVE SERVICES ===
// These are available but not currently used
export { default as HuggingFaceService } from './huggingFaceService';
export { default as PollyService } from './polly';
export { default as TranscribeService } from './transcribe';

/**
 * Service Configuration Guide:
 * 
 * CURRENTLY ACTIVE:
 * - ElevenLabsService: Conversational AI agent + TTS (Primary)
 * - StoryGenerationService: Conversation-to-story pipeline using Together AI (Primary)
 * 
 * AVAILABLE FOR FUTURE USE:
 * - HuggingFaceService: Alternative text + image generation
 * - PollyService: Alternative TTS (AWS Polly)
 * - TranscribeService: Speech-to-text (AWS Transcribe)
 * 
 * ENVIRONMENT VARIABLES NEEDED:
 * Active Services:
 * - ELEVENLABS_API_KEY (required)
 * - TOGETHER_API_KEY (required)
 * 
 * Future Services:
 * - HUGGING_FACE_API_KEY (optional)
 * - AWS_ACCESS_KEY_ID (optional)
 * - AWS_SECRET_ACCESS_KEY (optional)
 * - AWS_REGION (optional)
 * - BACKEND_URL (optional, for Laravel integration)
 */

