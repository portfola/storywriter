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

import client from '@/src/api/client';

// --- Configuration and Types ---

//const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || 'http://127.0.0.1:8000';
// const API_BASE_URL = 'http://127.0.0.1:8000';
const API_BASE_URL = __DEV__
  ? 'http://127.0.0.1:8000'              // Used during development
  : 'https://api.storywriter.net';       // Used in production build


const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
const GRACEFUL_SHUTDOWN_TIMEOUT_MS = 5000; // 5 seconds

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

// Default voice settings for TTS consistency
const DEFAULT_VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.0,
  use_speaker_boost: true,
};

// --- Service Implementation ---

export class ElevenLabsService {
  private client: ElevenLabsClient | null = null;
  private defaultVoiceId: string;
  private defaultModelId: string;
  private agentId: string;
  private currentConversation: ConversationSession | null = null;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private shutdownTimeout: NodeJS.Timeout | null = null;
  private sessionId: string | null = null;

  constructor() {
    this.defaultVoiceId = "EXAVITQu4vr4xnSDxMaL"; // Bella voice (good for storytelling)
    this.defaultModelId = "eleven_multilingual_v2"; // Recommended model
    this.agentId = "agent_01jxvakybhfmnr3yqvwxwye3sj"; // Your StoryWriter Agent
  }

  // --- Utility Methods ---

  /**
   * Helper to construct TextToSpeechOptions with defaults and overrides.
   * @param text The text to convert.
   * @param options Partial user-provided options.
   * @returns Complete TextToSpeechOptions object.
   */
  private buildTtsOptions(text: string, options?: Partial<TextToSpeechOptions>): TextToSpeechOptions {
    return {
      text: text.trim(),
      model_id: options?.model_id || this.defaultModelId,
      voice_settings: {
        ...DEFAULT_VOICE_SETTINGS,
        ...options?.voice_settings
      },
      ...options
    };
  }

  /**
   * Universal API request handler with built-in timeout and error handling.
   */
  private async makeApiRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    timeout: number = DEFAULT_TIMEOUT_MS
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const defaultHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      // Overwrite default headers for specific requests (like the audio/mpeg one)
      const headers = { ...defaultHeaders, ...options.headers };

      const response = await fetch(url, {
        signal: controller.signal,
        ...options,
        headers,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Attempt to parse JSON error, fall back to statusText
        const errorDetail = await response.text().catch(() => response.statusText);
        throw new Error(`HTTP ${response.status}: ${errorDetail}`);
      }

      // Handle no-content responses (e.g., DELETE) or non-JSON responses
      if (response.headers.get('content-type')?.includes('application/json')) {
        const data = await response.json();
        return { success: true, data };
      }

      return { success: true };

    } catch (error) {
      // Assuming serviceLogger is available
      serviceLogger.elevenlabs.error(error, { endpoint, options });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network request failed'
      };
    }
  }

  /**
   * Reusable function to enforce text length constraints.
   */
  private validateText(text: string): void {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }
    if (text.length > 5000) {
      throw new Error('Text is too long. Maximum length is 5000 characters.');
    }
  }

  // --- Text-to-Speech (TTS) Methods ---

  /**
   * Convert text to speech. Uses SDK if available, falls back to Laravel backend.
   */
  async generateSpeech(
    text: string,
    voiceId?: string,
    options?: Partial<TextToSpeechOptions>
  ): Promise<AudioGenerationResult> {
    try {
      this.validateText(text);

      const ttsOptions = this.buildTtsOptions(text, options);
      const finalVoiceId = voiceId || this.defaultVoiceId;

      // 1. SDK Client Method
      if (this.client) {
        const audio = await this.client.textToSpeech.convert(finalVoiceId, ttsOptions);
        return { audio, request_id: undefined };
      }

      // 2. Laravel Backend Fallback
      const requestBody = {
        text: ttsOptions.text,
        voiceId: finalVoiceId,
        options: ttsOptions,
      };

      const url = `/api/voice/tts`;
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify(requestBody),
        signal: this.createTimeoutSignal().signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const audioBuffer = await response.arrayBuffer();
      return { audio: new Uint8Array(audioBuffer), request_id: undefined };

    } catch (error) {
      throw this.handleError(error, 'Failed to generate speech');
    }
  }

  /**
   * Generate speech with streaming. Uses SDK if available, falls back to buffered result.
   */
  async generateSpeechStream(
    text: string,
    voiceId?: string,
    options?: Partial<TextToSpeechOptions>
  ): Promise<ReadableStream> {
    try {
      this.validateText(text);

      const ttsOptions = this.buildTtsOptions(text, options);
      const finalVoiceId = voiceId || this.defaultVoiceId;

      // 1. SDK Client Method (Streaming)
      if (this.client) {
        return await this.client.textToSpeech.stream(finalVoiceId, ttsOptions);
      }

      // 2. Fallback to regular generation and create stream
      const result = await this.generateSpeech(text, finalVoiceId, options);

      return new ReadableStream({
        start(controller) {
          controller.enqueue(result.audio);
          controller.close();
        }
      });

    } catch (error) {
      throw this.handleError(error, 'Failed to generate speech stream');
    }
  }

  /**
   * Generate speech for a story prompt with optimized settings
   */
  async generateStoryPromptSpeech(prompt: string): Promise<AudioGenerationResult> {
    const storyVoiceSettings = {
      stability: 0.7,
      similarity_boost: 0.8,
      style: 0.2,
      use_speaker_boost: true
    };

    return this.generateSpeech(prompt, undefined, {
      voice_settings: storyVoiceSettings,
      model_id: "eleven_multilingual_v2"
    });
  }

  // --- Voice/Model Metadata Methods ---

  /**
   * Get available voices from Laravel backend
   */
  async getVoices(): Promise<any[]> {
    const response = await this.makeApiRequest<{ voices: any[] }>('/api/voice/voices');

    if (!response.success || !response.data) {
      throw this.handleError(response.error, 'Failed to fetch voices');
    }

    return response.data.voices;
  }

  /**
   * Get available models (hardcoded list)
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

  // --- Conversation Agent Methods ---

  /**
   * Start a conversation with the StoryWriter Agent using ElevenLabs SDK
   */
  async startConversationAgent(callbacks: ConversationCallbacks = {}): Promise<ConversationSession> {
    if (this.currentConversation) {
      await this.endConversationAgent(); // Ensure any previous session is ended
    }

    this.connectionState = ConnectionState.CONNECTING;
    serviceLogger.elevenlabs.call('Starting conversation with StoryWriter Agent', { agentId: this.agentId });

    try {
      const response = await this.makeApiRequest<{
        sessionId: string,
        apiKey: string,
        agentId: string,
        expiresAt: string
      }>('/api/conversation/sdk-credentials', {
        method: 'POST',
        body: JSON.stringify({ agentId: this.agentId }),
      });

      if (!response.success || !response.data?.sessionId || !response.data?.apiKey) {
        throw new Error(response.error || 'Missing sessionId or apiKey in credentials response');
      }

      const { sessionId, apiKey } = response.data;
      this.sessionId = sessionId;
      this.client = new ElevenLabsClient({ apiKey });

      serviceLogger.elevenlabs.call('Got SDK credentials for conversation', { sessionId, expiresAt: response.data.expiresAt });

      // Start conversation using ElevenLabs SDK
      const conversation = await Conversation.startSession({
        agentId: this.agentId,

        onConnect: () => {
          this.connectionState = ConnectionState.CONNECTED;
          serviceLogger.elevenlabs.call('WebSocket connected');
          callbacks.onConnect?.();
        },

        onDisconnect: () => this.handleDisconnect(callbacks.onDisconnect),

        onMessage: (message) => callbacks.onMessage?.(message), // Simplified message handling

        onError: (error: any) => this.handleErrorEvent(error, callbacks.onError),

        onStatusChange: (status) => callbacks.onStatusChange?.(status.toString()),
        onModeChange: (mode) => callbacks.onModeChange?.(mode.toString())
      });

      const session: ConversationSession = {
        conversation,
        endSession: async () => this.gracefulShutdown(conversation),
        getId: () => conversation.getId(),
        setVolume: async (options) => {
          if (this.canSendMessages()) {
            await conversation.setVolume(options);
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
   * Internal handler for conversation disconnection.
   */
  private handleDisconnect(onDisconnectCallback?: () => void): void {
    if (this.connectionState !== ConnectionState.DISCONNECTING) {
      // If we are not actively disconnecting, this is an unexpected disconnection
      serviceLogger.elevenlabs.call('Unexpected WebSocket disconnected - cleaning up');
      this.forceCleanup();
    }
    // If we are disconnecting, the state change will happen after gracefulShutdown completes
    onDisconnectCallback?.();
  }

  /**
   * Internal handler for conversation errors.
   */
  private handleErrorEvent(error: any, onErrorCallback?: (error: any) => void): void {
    this.connectionState = ConnectionState.ERROR;
    this.currentConversation = null;
    serviceLogger.elevenlabs.error(error, { action: 'websocket_error' });
    onErrorCallback?.(error);
  }

  /**
   * End the current conversation session with proper cleanup
   */
  async endConversationAgent(): Promise<void> {
    if (this.currentConversation) {
      await this.gracefulShutdown(this.currentConversation.conversation);
    }
  }

  /**
   * Graceful shutdown of the WebSocket connection with a timeout.
   */
  private async gracefulShutdown(conversation: Conversation): Promise<void> {
    if (this.connectionState === ConnectionState.DISCONNECTED ||
      this.connectionState === ConnectionState.DISCONNECTING) {
      serviceLogger.elevenlabs.call('Shutdown skipped - already disconnected/disconnecting');
      return;
    }

    this.connectionState = ConnectionState.DISCONNECTING;
    serviceLogger.elevenlabs.call('Starting graceful shutdown');

    const shutdownPromise = conversation.endSession().catch((error) => {
      const isWebSocketStateError = error?.message?.includes('CLOSING') ||
        error?.message?.includes('CLOSED');

      if (!isWebSocketStateError) {
        // Only log non-state errors
        serviceLogger.elevenlabs.error(error, { action: 'graceful_shutdown_error' });
      }
      // Regardless of error, we proceed to cleanup.
    });

    // Use Promise.race for graceful shutdown with timeout
    const timeoutPromise = new Promise<void>(resolve => {
      this.shutdownTimeout = setTimeout(() => {
        serviceLogger.elevenlabs.call('Graceful shutdown timeout - forcing cleanup');
        this.cleanupState();
        resolve(); // Resolve the timeout promise
      }, GRACEFUL_SHUTDOWN_TIMEOUT_MS);
    });

    await Promise.race([shutdownPromise, timeoutPromise]);

    // Clear the timeout if the shutdown completed before the timeout
    if (this.shutdownTimeout) {
      clearTimeout(this.shutdownTimeout);
      this.shutdownTimeout = null;
    }

    // Final cleanup regardless of success/timeout
    this.cleanupState();
    serviceLogger.elevenlabs.call('Graceful shutdown completed/timeout handled');
  }

  /**
   * Force cleanup of any active conversation resources (Public facing).
   */
  forceCleanup(): void {
    this.cleanupState();
    serviceLogger.elevenlabs.call('Force cleanup completed - state reset');
  }

  /**
   * Synchronous state cleanup logic.
   */
  private cleanupState(): void {
    // 1. Clear timeout
    if (this.shutdownTimeout) {
      clearTimeout(this.shutdownTimeout);
      this.shutdownTimeout = null;
    }

    // 2. Clear API client and conversation state
    this.currentConversation = null;
    this.sessionId = null;
    this.client = null;
    this.connectionState = ConnectionState.DISCONNECTED;

    // We don't need to manually call this.currentConversation.endSession() here 
    // because the WebSocket SDK's onDisconnect/onError will handle that, and 
    // the gracefulShutdown already tried it.
  }

  // --- Simple Accessors/Mutators ---

  setDefaultVoice(voiceId: string): void { this.defaultVoiceId = voiceId; }
  setDefaultModel(modelId: string): void { this.defaultModelId = modelId; }
  getDefaultVoice(): string { return this.defaultVoiceId; }
  getDefaultModel(): string { return this.defaultModelId; }
  isConversationActive(): boolean {
    return this.currentConversation !== null && this.connectionState === ConnectionState.CONNECTED;
  }
  getConnectionState(): string { return this.connectionState; }
  canSendMessages(): boolean { return this.connectionState === ConnectionState.CONNECTED; }
  getCurrentConversation(): ConversationSession | null { return this.currentConversation; }
  async setConversationVolume(volume: number): Promise<void> {
    if (this.currentConversation) {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      await this.currentConversation.setVolume({ volume: clampedVolume });
    }
  }

  /**
   * Helper to create an AbortController with a set timeout.
   */
  private createTimeoutSignal(timeout: number = DEFAULT_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    return { controller, timeoutId, signal: controller.signal };
  }

  // --- Error Handling ---

  /**
   * Comprehensive error handling for backend API errors
   */
  private handleError(error: unknown, context: string): ElevenLabsError {
    // ... (Error handling logic remains similar, but is now focused only here)
    serviceLogger.elevenlabs.error(error, { context });

    const elevenlabsError: ElevenLabsError = new Error(`${context}: Unknown error occurred`);
    const errorObj = error as any;

    elevenlabsError.message = errorObj?.message || elevenlabsError.message;

    // Simplified status code mapping
    const status = errorObj?.status || 0;
    elevenlabsError.status = status;

    if (status === 401) elevenlabsError.message = `${context}: Invalid API key or unauthorized access`;
    else if (status === 400) elevenlabsError.message = `${context}: Invalid request parameters - ${elevenlabsError.message}`;
    else if (status === 429) elevenlabsError.message = `${context}: Rate limit exceeded. Please try again later.`;
    else if (status >= 500) elevenlabsError.message = `${context}: Backend server error or service unavailable.`;

    if (errorObj?.code) elevenlabsError.code = errorObj.code;
    if (errorObj?.details) elevenlabsError.details = errorObj.details;

    return elevenlabsError;
  }
}

// Export singleton instance
export default new ElevenLabsService();