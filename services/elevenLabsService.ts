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

const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:8000';

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
  private defaultVoiceId: string;
  private defaultModelId: string;
  private agentId: string;
  private currentConversation: ConversationSession | null;
  private connectionState: ConnectionState;
  private shutdownTimeout: NodeJS.Timeout | null;
  private readonly GRACEFUL_SHUTDOWN_TIMEOUT = 5000; // 5 seconds
  private websocket: WebSocket | null;
  private sessionId: string | null;

  constructor() {
    // Default to a good narrative voice - you can change this to your preferred voice ID
    this.defaultVoiceId = "EXAVITQu4vr4xnSDxMaL"; // Bella voice (good for storytelling)
    this.defaultModelId = "eleven_multilingual_v2"; // Recommended model
    this.agentId = "agent_01jxvakybhfmnr3yqvwxwye3sj"; // Your StoryWriter Agent
    this.currentConversation = null;
    this.connectionState = ConnectionState.DISCONNECTED;
    this.shutdownTimeout = null;
    this.websocket = null;
    this.sessionId = null;
  }

  private async makeApiRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
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
   * Convert text to speech using Laravel backend
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

      const requestBody = {
        text: text.trim(),
        voice_id: voiceId || this.defaultVoiceId,
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

      const response = await this.makeApiRequest<{ audio: ArrayBuffer, request_id?: string }>(
        '/api/elevenlabs/tts',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to generate speech');
      }

      return {
        audio: new Uint8Array(response.data.audio),
        request_id: response.data.request_id
      };

    } catch (error) {
      throw this.handleError(error, 'Failed to generate speech');
    }
  }

  /**
   * Generate speech with streaming for long texts (not implemented in backend yet)
   */
  async generateSpeechStream(
    text: string, 
    voiceId?: string, 
    options?: Partial<TextToSpeechOptions>
  ): Promise<ReadableStream> {
    // For now, fallback to regular generation
    // TODO: Implement streaming in Laravel backend
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
  }

  /**
   * Get available voices from Laravel backend
   */
  async getVoices(): Promise<any[]> {
    try {
      const response = await this.makeApiRequest<{ voices: any[] }>('/api/elevenlabs/voices');
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch voices');
      }

      return response.data.voices;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch voices');
    }
  }

  /**
   * Get available models from Laravel backend
   */
  async getModels(): Promise<string[]> {
    try {
      const response = await this.makeApiRequest<{ models: string[] }>('/api/elevenlabs/models');
      
      if (!response.success || !response.data) {
        // Fallback to common models if backend fails
        return [
          "eleven_multilingual_v2",
          "eleven_flash_v2_5", 
          "eleven_turbo_v2_5"
        ];
      }

      return response.data.models;
    } catch (error) {
      // Return fallback models on error
      return [
        "eleven_multilingual_v2",
        "eleven_flash_v2_5", 
        "eleven_turbo_v2_5"
      ];
    }
  }

  /**
   * Get a specific voice by ID from Laravel backend
   */
  async getVoice(voiceId: string): Promise<any> {
    try {
      const response = await this.makeApiRequest<any>(`/api/elevenlabs/voices/${voiceId}`);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || `Failed to fetch voice with ID: ${voiceId}`);
      }

      return response.data;
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
   * Start a conversation with the StoryWriter Agent via Laravel backend
   */
  async startConversationAgent(callbacks: ConversationCallbacks = {}): Promise<ConversationSession> {
    try {
      // End any existing conversation first
      if (this.currentConversation) {
        await this.endConversationAgent();
      }

      this.connectionState = ConnectionState.CONNECTING;
      serviceLogger.elevenlabs.call('Starting conversation with StoryWriter Agent', { agentId: this.agentId });

      // Start conversation session via Laravel backend
      const response = await this.makeApiRequest<{ session_id: string, websocket_url: string }>(
        '/api/conversation/start',
        {
          method: 'POST',
          body: JSON.stringify({ agent_id: this.agentId }),
        }
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to start conversation session');
      }

      this.sessionId = response.data.session_id;
      const websocketUrl = response.data.websocket_url || `ws://localhost:8000/ws/conversation/${this.sessionId}`;

      // Connect to WebSocket
      await this.connectWebSocket(websocketUrl, callbacks);

      const session: ConversationSession = {
        conversation: {
          getId: () => this.sessionId!,
          endSession: async () => {
            await this.gracefulShutdown();
          }
        },
        endSession: async () => {
          await this.gracefulShutdown();
        },
        getId: () => this.sessionId!,
        setVolume: async (options) => {
          if (this.connectionState === ConnectionState.CONNECTED && this.websocket) {
            try {
              this.websocket.send(JSON.stringify({
                type: 'set_volume',
                volume: options.volume
              }));
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
   * Connect to WebSocket for real-time conversation
   */
  private async connectWebSocket(url: string, callbacks: ConversationCallbacks): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.websocket = new WebSocket(url);

        this.websocket.onopen = () => {
          this.connectionState = ConnectionState.CONNECTED;
          serviceLogger.elevenlabs.call('WebSocket connected');
          callbacks.onConnect?.();
          resolve();
        };

        this.websocket.onclose = () => {
          this.connectionState = ConnectionState.DISCONNECTED;
          this.currentConversation = null;
          this.websocket = null;
          serviceLogger.elevenlabs.call('WebSocket disconnected');
          callbacks.onDisconnect?.();
        };

        this.websocket.onmessage = (event) => {
          if (this.connectionState === ConnectionState.CONNECTED || 
              this.connectionState === ConnectionState.CONNECTING) {
            try {
              const message = JSON.parse(event.data);
              callbacks.onMessage?.(message);
            } catch (error) {
              serviceLogger.elevenlabs.error(error, { action: 'parse_websocket_message' });
            }
          }
        };

        this.websocket.onerror = (error) => {
          this.connectionState = ConnectionState.ERROR;
          this.currentConversation = null;
          this.websocket = null;
          serviceLogger.elevenlabs.error(error, { action: 'websocket_error' });
          callbacks.onError?.(error);
          reject(error);
        };

        // Set timeout for connection
        setTimeout(() => {
          if (this.connectionState !== ConnectionState.CONNECTED) {
            this.websocket?.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000); // 10 second timeout

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Graceful shutdown with timeout
   */
  private async gracefulShutdown(): Promise<void> {
    if (this.connectionState === ConnectionState.DISCONNECTED || 
        this.connectionState === ConnectionState.DISCONNECTING) {
      serviceLogger.elevenlabs.call('Graceful shutdown skipped - already disconnected/disconnecting', {
        currentState: this.connectionState
      });
      return;
    }

    this.connectionState = ConnectionState.DISCONNECTING;
    serviceLogger.elevenlabs.call('Starting graceful shutdown');

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

      // End conversation session via Laravel backend
      if (this.sessionId) {
        this.makeApiRequest('/api/conversation/end', {
          method: 'POST',
          body: JSON.stringify({ session_id: this.sessionId }),
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
    });
  }

  /**
   * End the current conversation session with proper cleanup
   */
  async endConversationAgent(): Promise<void> {
    if (this.currentConversation) {
      try {
        await this.gracefulShutdown();
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
      serviceLogger.elevenlabs.call('Force cleaning up conversation resources', {
        currentState: this.connectionState
      });
      
      // Clear any pending shutdown timeout
      if (this.shutdownTimeout) {
        clearTimeout(this.shutdownTimeout);
        this.shutdownTimeout = null;
      }

      // Close WebSocket if open
      if (this.websocket) {
        try {
          this.websocket.close();
        } catch (error) {
          serviceLogger.elevenlabs.error(error, { action: 'force_close_websocket' });
        }
        this.websocket = null;
      }

      // Reset state
      this.connectionState = ConnectionState.DISCONNECTED;
      this.currentConversation = null;
      this.sessionId = null;
      
      serviceLogger.elevenlabs.call('Force cleanup completed - state reset');
    } catch (error) {
      serviceLogger.elevenlabs.error(error, { action: 'force_cleanup_error' });
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
    return this.connectionState === ConnectionState.CONNECTED && this.websocket !== null;
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