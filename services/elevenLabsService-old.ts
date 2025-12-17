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

const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || 'http://127.0.0.1:8000';

enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  ERROR = 'error'
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export class ElevenLabsService {
  private client: ElevenLabsClient | null;
  private defaultVoiceId: string;
  private defaultModelId: string;
  private agentId: string;
  private currentConversation: ConversationSession | null;
  private connectionState: ConnectionState;
  private shutdownTimeout: NodeJS.Timeout | null;
  private readonly GRACEFUL_SHUTDOWN_TIMEOUT = 5000; // 5 seconds
  private sessionId: string | null;

  constructor() {
    // Default to a good narrative voice - you can change this to your preferred voice ID
    this.defaultVoiceId = "EXAVITQu4vr4xnSDxMaL"; // Bella voice (good for storytelling)
    this.defaultModelId = "eleven_multilingual_v2"; // Recommended model
    this.agentId = "agent_01jxvakybhfmnr3yqvwxwye3sj"; // Your StoryWriter Agent
    this.currentConversation = null;
    this.connectionState = ConnectionState.DISCONNECTED;
    this.shutdownTimeout = null;
    this.sessionId = null;
    this.client = null; // Will be initialized with API key from backend
  }

  private async makeApiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      console.log("URL:", url);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      serviceLogger.elevenlabs.error(error, { endpoint, options });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network request failed'
      };
    }
  }

  /**
   * Convert text to speech using ElevenLabs client or Laravel backend
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

      // If we have an initialized client, use it directly
      if (this.client) {
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
      }

      // Fallback to Laravel backend
      const requestBody = {
        text: text.trim(),
        voiceId: voiceId || this.defaultVoiceId,
        options: {
          model_id: options?.model_id || this.defaultModelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
            ...options?.voice_settings
          },
          ...options
        }
      };

      const url = `${API_BASE_URL}/api/voice/tts`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const audioBuffer = await response.arrayBuffer();

      return {
        audio: new Uint8Array(audioBuffer),
        request_id: undefined // TTS endpoint doesn't return request_id
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

      // If we have an initialized client, use it for streaming
      if (this.client) {
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
      }

      // Fallback to regular generation and create stream
      const result = await this.generateSpeech(text, voiceId, options);

      return new ReadableStream({
        start(controller) {
          const audioData = result.audio instanceof ArrayBuffer
            ? new Uint8Array(result.audio)
            : result.audio;
          controller.enqueue(audioData);
          controller.close();
        }
      });

    } catch (error) {
      throw this.handleError(error, 'Failed to generate speech stream');
    }
  }

  /**
   * Get available voices from Laravel backend
   */
  async getVoices(): Promise<any[]> {
    try {
      const response = await this.makeApiRequest<{ voices: any[] }>('/api/voice/voices');

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch voices');
      }

      return response.data.voices;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch voices');
    }
  }

  /**
   * Get available models (fallback list since backend doesn't provide this endpoint)
   */
  async getModels(): Promise<string[]> {
    // Backend doesn't provide models endpoint, return common models
    return [
      "eleven_multilingual_v2",
      "eleven_flash_v2_5",
      "eleven_turbo_v2_5"
    ];
  }

  /**
   * Get a specific voice by ID (searches through all voices since backend doesn't provide individual endpoints)
   */
  async getVoice(voiceId: string): Promise<any> {
    try {
      const voices = await this.getVoices();
      const voice = voices.find((v: any) => v.voice_id === voiceId);

      if (!voice) {
        throw new Error(`Voice with ID ${voiceId} not found`);
      }

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
   * Start a conversation with the StoryWriter Agent using ElevenLabs SDK
   */
  async startConversationAgent(callbacks: ConversationCallbacks = {}): Promise<ConversationSession> {
    try {
      // End any existing conversation first
      if (this.currentConversation) {
        await this.endConversationAgent();
      }

      this.connectionState = ConnectionState.CONNECTING;
      serviceLogger.elevenlabs.call('Starting conversation with StoryWriter Agent', { agentId: this.agentId });

      // Get SDK credentials from Laravel backend
      const response = await this.makeApiRequest<{
        sessionId: string,
        apiKey: string,
        agentId: string,
        expiresAt: string
      }>('/api/conversation/sdk-credentials', {
        method: 'POST',
        body: JSON.stringify({
          agentId: this.agentId
        }),
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to get SDK credentials for conversation');
      }

      if (!response.data.sessionId || !response.data.apiKey) {
        throw new Error('Missing sessionId or apiKey in response');
      }

      this.sessionId = response.data.sessionId;
      const apiKey = response.data.apiKey;

      serviceLogger.elevenlabs.call('Got SDK credentials for conversation', {
        sessionId: this.sessionId ?? undefined,
        expiresAt: response.data.expiresAt
      });

      // Initialize ElevenLabs client with API key from backend
      this.client = new ElevenLabsClient({
        apiKey: apiKey,
      });

      // Start conversation using ElevenLabs SDK
      const conversation = await Conversation.startSession({
        agentId: this.agentId,

        onConnect: () => {
          this.connectionState = ConnectionState.CONNECTED;
          serviceLogger.elevenlabs.call('WebSocket connected');
          callbacks.onConnect?.();
        },

        onDisconnect: () => {
          this.connectionState = ConnectionState.DISCONNECTED;
          this.currentConversation = null;
          serviceLogger.elevenlabs.call('WebSocket disconnected');
          callbacks.onDisconnect?.();
        },

        onMessage: (message) => {
          // Only process messages if we're connected or connecting
          if (this.connectionState === ConnectionState.CONNECTED ||
            this.connectionState === ConnectionState.CONNECTING) {
            callbacks.onMessage?.(message);
          } else {
            serviceLogger.elevenlabs.call('Discarding message - connection not ready', {
              state: this.connectionState,
              messageSource: message.source || 'unknown'
            });
          }
        },

        onError: (error: any) => {
          this.connectionState = ConnectionState.ERROR;
          this.currentConversation = null;
          serviceLogger.elevenlabs.error(error, { action: 'websocket_error' });
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
          await this.gracefulShutdown(conversation);
        },
        getId: () => conversation.getId(),
        setVolume: async (options) => {
          if (this.connectionState === ConnectionState.CONNECTED) {
            try {
              await conversation.setVolume(options);
            } catch (error) {
              serviceLogger.elevenlabs.error(error, { action: 'set_volume' });
              throw new Error('Failed to set volume - connection may be closed');
            }
          } else {
            throw new Error('Cannot set volume - WebSocket not connected');
          }
        }
      };

      this.currentConversation = session;
      return session;

    } catch (error) {
      this.connectionState = ConnectionState.ERROR;
      throw this.handleError(error, 'Failed to start conversation with StoryWriter Agent');
    }
  }


  /**
   * Graceful shutdown with timeout
   */
  private async gracefulShutdown(conversation?: any): Promise<void> {
    if (this.connectionState === ConnectionState.DISCONNECTED ||
      this.connectionState === ConnectionState.DISCONNECTING) {
      serviceLogger.elevenlabs.call('Graceful shutdown skipped - already disconnected/disconnecting', {
        currentState: this.connectionState,
        sessionId: this.sessionId ?? undefined
      });
      return;
    }

    this.connectionState = ConnectionState.DISCONNECTING;
    serviceLogger.elevenlabs.call('Starting graceful shutdown', {
      sessionId: this.sessionId ?? undefined
    });

    return new Promise<void>((resolve) => {
      let resolved = false;

      // Set timeout for graceful shutdown
      this.shutdownTimeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          serviceLogger.elevenlabs.call('Graceful shutdown timeout - forcing cleanup');
          this.forceCleanupSync();
          resolve();
        }
      }, this.GRACEFUL_SHUTDOWN_TIMEOUT);

      // If we have a conversation from SDK, end it gracefully
      if (conversation) {
        try {
          conversation.endSession()
            .then(() => {
              if (!resolved) {
                resolved = true;
                serviceLogger.elevenlabs.call('Graceful shutdown completed successfully');
                this.forceCleanupSync();
                if (this.shutdownTimeout) {
                  clearTimeout(this.shutdownTimeout);
                  this.shutdownTimeout = null;
                }
                resolve();
              }
            })
            .catch((error: any) => {
              if (!resolved) {
                resolved = true;
                // Check if it's a WebSocket state error (common and expected)
                const isWebSocketStateError = error?.message?.includes('CLOSING') ||
                  error?.message?.includes('CLOSED');

                if (isWebSocketStateError) {
                  serviceLogger.elevenlabs.call('WebSocket already closing/closed - shutdown complete', {
                    error: error.message
                  });
                } else {
                  serviceLogger.elevenlabs.error(error, { action: 'graceful_shutdown_error' });
                }

                this.forceCleanupSync();
                if (this.shutdownTimeout) {
                  clearTimeout(this.shutdownTimeout);
                  this.shutdownTimeout = null;
                }
                resolve();
              }
            });
        } catch (syncError: any) {
          if (!resolved) {
            resolved = true;
            serviceLogger.elevenlabs.call('Synchronous error during shutdown - likely already closed', {
              error: syncError?.message
            });
            this.forceCleanupSync();
            if (this.shutdownTimeout) {
              clearTimeout(this.shutdownTimeout);
              this.shutdownTimeout = null;
            }
            resolve();
          }
        }
      } else {
        // Fallback: invalidate session in backend
        if (this.sessionId) {
          this.makeApiRequest(`/api/conversation/signed-url/${this.sessionId}`, {
            method: 'DELETE'
          }).finally(() => {
            if (!resolved) {
              resolved = true;
              this.forceCleanupSync();
              if (this.shutdownTimeout) {
                clearTimeout(this.shutdownTimeout);
                this.shutdownTimeout = null;
              }
              resolve();
            }
          });
        } else {
          if (!resolved) {
            resolved = true;
            this.forceCleanupSync();
            if (this.shutdownTimeout) {
              clearTimeout(this.shutdownTimeout);
              this.shutdownTimeout = null;
            }
            resolve();
          }
        }
      }
    });
  }

  /**
   * End the current conversation session with proper cleanup
   */
  async endConversationAgent(): Promise<void> {
    if (this.currentConversation) {
      try {
        await this.gracefulShutdown(this.currentConversation.conversation);
        serviceLogger.elevenlabs.call('Conversation ended successfully');
      } catch (error) {
        serviceLogger.elevenlabs.error(error, { action: 'end_conversation' });
        // Force cleanup even if graceful shutdown fails
        this.forceCleanupSync();
      }
    }
  }

  /**
   * Force cleanup of any active conversation resources
   */
  forceCleanup(): void {
    this.forceCleanupSync();
  }

  private forceCleanupSync(): void {
    try {
      if (this.currentConversation) {
        serviceLogger.elevenlabs.call('Force cleaning up conversation resources', {
          currentState: this.connectionState,
          sessionId: this.sessionId ?? undefined
        });

        // Clear any pending shutdown timeout
        if (this.shutdownTimeout) {
          clearTimeout(this.shutdownTimeout);
          this.shutdownTimeout = null;
        }

        // Attempt cleanup but don't wait or throw
        try {
          // Fire and forget - don't await or throw
          this.currentConversation.endSession().catch((error) => {
            // Silently log error but don't propagate
            serviceLogger.elevenlabs.error(error, {
              action: 'force_cleanup_async',
              note: 'Error ignored during force cleanup'
            });
          });
        } catch (syncError) {
          // Log synchronous errors but don't throw
          serviceLogger.elevenlabs.error(syncError, {
            action: 'force_cleanup_sync',
            note: 'Synchronous error ignored during force cleanup'
          });
        }
      }
    } catch (outerError) {
      // Catch any unexpected errors and log them
      serviceLogger.elevenlabs.error(outerError, {
        action: 'force_cleanup_outer',
        note: 'Outer error caught and ignored during force cleanup'
      });
    } finally {
      // Always reset state regardless of any errors
      this.connectionState = ConnectionState.DISCONNECTED;
      this.currentConversation = null;
      this.sessionId = null;
      this.client = null;
      if (this.shutdownTimeout) {
        clearTimeout(this.shutdownTimeout);
        this.shutdownTimeout = null;
      }
      serviceLogger.elevenlabs.call('Force cleanup completed - state reset');
    }
  }

  /**
   * Check if there's an active conversation
   */
  isConversationActive(): boolean {
    return this.currentConversation !== null &&
      this.connectionState === ConnectionState.CONNECTED;
  }

  /**
   * Get current connection state
   */
  getConnectionState(): string {
    return this.connectionState;
  }

  /**
   * Check if WebSocket is in a state that can send messages
   */
  canSendMessages(): boolean {
    return this.connectionState === ConnectionState.CONNECTED;
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
   * Comprehensive error handling for backend API errors
   */
  private handleError(error: unknown, context: string): ElevenLabsError {
    serviceLogger.elevenlabs.error(error, { context });

    const errorObj = error as any;
    const errorMessage = errorObj?.message || 'Unknown error occurred';

    const elevenlabsError: ElevenLabsError = new Error(
      `${context}: ${errorMessage}`
    );

    if (errorObj?.status) {
      elevenlabsError.status = errorObj.status;

      switch (errorObj.status) {
        case 401:
          elevenlabsError.message = `${context}: Invalid API key or unauthorized access`;
          break;
        case 400:
          elevenlabsError.message = `${context}: Invalid request parameters - ${errorMessage}`;
          break;
        case 429:
          elevenlabsError.message = `${context}: Rate limit exceeded. Please try again later.`;
          break;
        case 500:
          elevenlabsError.message = `${context}: Backend server error. Please try again later.`;
          break;
        case 503:
          elevenlabsError.message = `${context}: Service temporarily unavailable. Please try again later.`;
          break;
      }
    }

    if (errorObj?.code) {
      elevenlabsError.code = errorObj.code;
    }

    if (errorObj?.details) {
      elevenlabsError.details = errorObj.details;
    }

    return elevenlabsError;
  }
}

// Export singleton instance
export default new ElevenLabsService();