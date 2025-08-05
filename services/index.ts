/**
 * AI Services Registry
 * 
 * This file documents all available AI services in the StoryWriter app.
 * Only ElevenLabs and Together AI are currently active.
 */

// === ACTIVE SERVICES ===
export { default as ElevenLabsService } from './elevenLabsService';
export { default as TogetherAIService } from './togetherAiService';

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
 * - TogetherAIService: Text + Image generation (Primary)
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

export interface ServiceStatus {
  name: string;
  active: boolean;
  configured: boolean;
  description: string;
}

/**
 * Get status of all available services
 */
export async function getAllServicesStatus(): Promise<ServiceStatus[]> {
  const { default: elevenlabs } = await import('./elevenLabsService');
  const { default: together } = await import('./togetherAiService');
  const { default: huggingface } = await import('./huggingFaceService');
  const { default: polly } = await import('./polly');
  const { default: transcribe } = await import('./transcribe');

  return [
    {
      name: 'ElevenLabs',
      active: true,
      configured: true, // Always true since it throws on missing key
      description: 'Conversational AI agent + TTS (Primary)'
    },
    {
      name: 'Together AI',
      active: true,
      configured: true, // Always true since it throws on missing key
      description: 'Text + Image generation (Primary)'
    },
    {
      name: 'HuggingFace',
      active: false,
      configured: huggingface.isConfigured(),
      description: 'Alternative text + image generation'
    },
    {
      name: 'AWS Polly',
      active: false,
      configured: polly.isConfigured(),
      description: 'Alternative TTS service'
    },
    {
      name: 'AWS Transcribe',
      active: false,
      configured: transcribe.isConfigured(),
      description: 'Speech-to-text service'
    }
  ];
}