/**
 * AI Services Registry
 * 
 * This file documents all available AI services in the StoryWriter app.
 * Services now use Laravel backend integration instead of direct API calls.
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
 * CURRENTLY ACTIVE (Laravel Backend Integration):
 * - ElevenLabsService: Conversational AI agent + TTS via Laravel backend
 * - StoryGenerationService: Conversation-to-story pipeline via Laravel backend
 * 
 * AVAILABLE FOR FUTURE USE:
 * - HuggingFaceService: Alternative text + image generation
 * - PollyService: Alternative TTS (AWS Polly)
 * - TranscribeService: Speech-to-text (AWS Transcribe)
 * 
 * ENVIRONMENT VARIABLES NEEDED:
 * Backend Integration:
 * - API_BASE_URL (production: https://api.storywriter.net, staging: https://staging-api.storywriter.net, development: http://localhost)
 * 
 * Legacy Direct API Access (deprecated - now handled by backend):
 * - ELEVENLABS_API_KEY (removed - handled by backend)
 * - TOGETHER_API_KEY (removed - handled by backend)
 * 
 * Future Services:
 * - HUGGING_FACE_API_KEY (optional)
 * - AWS_ACCESS_KEY_ID (optional)
 * - AWS_SECRET_ACCESS_KEY (optional)
 * - AWS_REGION (optional)
 * - BACKEND_URL (legacy, use API_BASE_URL instead)
 * 
 * LARAVEL BACKEND ENDPOINTS:
 * - POST /api/conversation/start - Start ElevenLabs conversation
 * - POST /api/conversation/end - End ElevenLabs conversation
 * - WebSocket /ws/conversation/{sessionId} - Real-time conversation
 * - POST /api/elevenlabs/tts - Text-to-speech generation
 * - GET /api/elevenlabs/voices - Get available voices
 * - GET /api/elevenlabs/models - Get available models
 * - POST /api/stories/generate - Generate story from transcript
 * - GET /api/stories/models - Get available story generation models
 * - GET /api/health - Backend health check
 * 
 * FEATURES:
 * - Automatic request timeout handling (30s for TTS, 60s for stories)
 * - Network failure retry logic built into backend
 * - Authentication headers ready for future user auth
 * - Maintains same frontend interface (no breaking changes)
 * - WebSocket support for real-time conversation
 * - Graceful fallback when backend is unavailable
 */

