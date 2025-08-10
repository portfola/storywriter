import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { Conversation } from '@elevenlabs/client';
import Constants from 'expo-constants';
import { 
  ElevenLabsVoice, 
  ElevenLabsModel, 
  TextToSpeechOptions, 
  ElevenLabsError, 
  AudioGenerationResult,
  VoiceListResponse,
  ModelListResponse,
  ConversationCallbacks,
  ConversationSession
} from '../types/elevenlabs';
import { serviceLogger } from '@/src/utils/logger';

const ELEVENLABS_API_KEY = Constants.expoConfig?.extra?.ELEVENLABS_API_KEY;

export class ElevenLabsService {
  private client: ElevenLabsClient;
  private defaultVoiceId: string;
  private defaultModelId: string;
  private agentId: string;
  private currentConversation: ConversationSession | null;

  constructor() {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured in environment variables');
    }

    this.client = new ElevenLabsClient({
      apiKey: ELEVENLABS_API_KEY,
    });
    
    // Default to a good narrative voice - you can change this to your preferred voice ID
    this.defaultVoiceId = "EXAVITQu4vr4xnSDxMaL"; // Bella voice (good for storytelling)
    this.defaultModelId = "eleven_multilingual_v2"; // Recommended model
    this.agentId = "agent_01jxvakybhfmnr3yqvwxwye3sj"; // Your StoryWriter Agent
    this.currentConversation = null;
  }

  /**
   * Convert text to speech using ElevenLabs TTS API
   */
  async generateSpeech(
    text: string, 
    voiceId?: string, 
    options?: Partial<TextToSpeechOptions>
  ): Promise<AudioGenerationResult> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      if (text.length > 5000) {
        throw new Error('Text is too long. Maximum length is 5000 characters.');
      }

      const ttsOptions: TextToSpeechOptions = {
        text: text.trim(),
        model_id: options?.model_id || this.defaultModelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
          ...options?.voice_settings
        },
        ...options
      };

      const audio = await this.client.textToSpeech.convert(
        voiceId || this.defaultVoiceId,
        ttsOptions
      );

      return {
        audio,
        request_id: undefined // SDK doesn't return request_id in current version
      };

    } catch (error) {
      throw this.handleError(error, 'Failed to generate speech');
    }
  }

  /**
   * Generate speech with streaming for long texts
   */
  async generateSpeechStream(
    text: string, 
    voiceId?: string, 
    options?: Partial<TextToSpeechOptions>
  ): Promise<ReadableStream> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      const ttsOptions: TextToSpeechOptions = {
        text: text.trim(),
        model_id: options?.model_id || this.defaultModelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
          ...options?.voice_settings
        },
        ...options
      };

      const audioStream = await this.client.textToSpeech.stream(
        voiceId || this.defaultVoiceId,
        ttsOptions
      );

      return audioStream;

    } catch (error) {
      throw this.handleError(error, 'Failed to generate speech stream');
    }
  }

  /**
   * Get available voices from ElevenLabs
   */
  async getVoices(): Promise<any[]> {
    try {
      const response = await this.client.voices.getAll();
      return response.voices;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch voices');
    }
  }

  /**
   * Get available models from ElevenLabs (returns common models)
   */
  getModels(): string[] {
    return [
      "eleven_multilingual_v2",
      "eleven_flash_v2_5", 
      "eleven_turbo_v2_5"
    ];
  }

  /**
   * Get a specific voice by ID
   */
  async getVoice(voiceId: string): Promise<any> {
    try {
      const voice = await this.client.voices.get(voiceId);
      return voice;
    } catch (error) {
      throw this.handleError(error, `Failed to fetch voice with ID: ${voiceId}`);
    }
  }

  /**
   * Set the default voice ID for future speech generation
   */
  setDefaultVoice(voiceId: string): void {
    this.defaultVoiceId = voiceId;
  }

  /**
   * Set the default model ID for future speech generation
   */
  setDefaultModel(modelId: string): void {
    this.defaultModelId = modelId;
  }

  /**
   * Get current default voice ID
   */
  getDefaultVoice(): string {
    return this.defaultVoiceId;
  }

  /**
   * Get current default model ID
   */
  getDefaultModel(): string {
    return this.defaultModelId;
  }

  /**
   * Generate speech for a story prompt with optimized settings
   */
  async generateStoryPromptSpeech(prompt: string): Promise<AudioGenerationResult> {
    const storyVoiceSettings = {
      stability: 0.7,      // More stable for narrative
      similarity_boost: 0.8, // High similarity for consistency
      style: 0.2,          // Slight style for engagement
      use_speaker_boost: true
    };

    return this.generateSpeech(prompt, undefined, {
      voice_settings: storyVoiceSettings,
      model_id: "eleven_multilingual_v2" // Best for narrative content
    });
  }

  /**
   * Start a conversation with the StoryWriter Agent
   */
  async startConversationAgent(callbacks: ConversationCallbacks = {}): Promise<ConversationSession> {
    try {
      // End any existing conversation first
      if (this.currentConversation) {
        await this.endConversationAgent();
      }

      serviceLogger.elevenlabs.call('Starting conversation with StoryWriter Agent', { agentId: this.agentId });

      const conversation = await Conversation.startSession({
        agentId: this.agentId,
        
        onConnect: () => {
          callbacks.onConnect?.();
        },
        
        onDisconnect: () => {
          this.currentConversation = null;
          callbacks.onDisconnect?.();
        },
        
        onMessage: (message) => {
          callbacks.onMessage?.(message);
        },
        
        onError: (error) => {
          this.currentConversation = null;
          callbacks.onError?.(error);
        },
        
        onStatusChange: (status) => {
          callbacks.onStatusChange?.(status.toString());
        },
        
        onModeChange: (mode) => {
          callbacks.onModeChange?.(mode.toString());
        }
      });

      const session: ConversationSession = {
        conversation,
        endSession: async () => {
          await conversation.endSession();
          this.currentConversation = null;
        },
        getId: () => conversation.getId(),
        setVolume: async (options) => {
          await conversation.setVolume(options);
        }
      };

      this.currentConversation = session;
      return session;

    } catch (error) {
      throw this.handleError(error, 'Failed to start conversation with StoryWriter Agent');
    }
  }

  /**
   * End the current conversation session with proper cleanup
   */
  async endConversationAgent(): Promise<void> {
    if (this.currentConversation) {
      try {
        // Properly dispose of the conversation session
        await this.currentConversation.endSession();
        serviceLogger.elevenlabs.call('Conversation ended successfully');
      } catch (error) {
        serviceLogger.elevenlabs.error(error, { action: 'end_conversation' });
        // Continue with cleanup even if endSession fails
      } finally {
        // Ensure cleanup happens regardless of success/failure
        this.currentConversation = null;
      }
    }
  }

  /**
   * Force cleanup of any active conversation resources
   */
  forceCleanup(): void {
    if (this.currentConversation) {
      serviceLogger.elevenlabs.call('Force cleaning up conversation resources');
      
      try {
        // Attempt graceful shutdown first
        this.currentConversation.endSession().catch((error) => {
          serviceLogger.elevenlabs.error(error, { action: 'force_cleanup' });
        });
      } catch (error) {
        serviceLogger.elevenlabs.error(error, { action: 'force_cleanup_attempt' });
      } finally {
        this.currentConversation = null;
      }
    }
  }

  /**
   * Check if there's an active conversation
   */
  isConversationActive(): boolean {
    return this.currentConversation !== null;
  }

  /**
   * Get the current conversation session
   */
  getCurrentConversation(): ConversationSession | null {
    return this.currentConversation;
  }

  /**
   * Set volume for the current conversation
   */
  async setConversationVolume(volume: number): Promise<void> {
    if (this.currentConversation) {
      await this.currentConversation.setVolume({ volume: Math.max(0, Math.min(1, volume)) });
    }
  }

  /**
   * Comprehensive error handling for ElevenLabs API errors
   */
  private handleError(error: any, context: string): ElevenLabsError {
    serviceLogger.elevenlabs.error(error, { context });

    const elevenlabsError: ElevenLabsError = new Error(
      `${context}: ${error.message || 'Unknown error occurred'}`
    );

    if (error.status) {
      elevenlabsError.status = error.status;
      
      switch (error.status) {
        case 401:
          elevenlabsError.message = `${context}: Invalid API key or unauthorized access`;
          break;
        case 400:
          elevenlabsError.message = `${context}: Invalid request parameters - ${error.message}`;
          break;
        case 429:
          elevenlabsError.message = `${context}: Rate limit exceeded. Please try again later.`;
          break;
        case 500:
          elevenlabsError.message = `${context}: ElevenLabs server error. Please try again later.`;
          break;
      }
    }

    if (error.code) {
      elevenlabsError.code = error.code;
    }

    if (error.details) {
      elevenlabsError.details = error.details;
    }

    return elevenlabsError;
  }
}

// Export singleton instance
export default new ElevenLabsService();