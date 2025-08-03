/**
 * AWS Polly Service Types (Optional - Not Currently Used)
 * 
 * These types support AWS Polly text-to-speech functionality.
 * Currently disabled in favor of ElevenLabs TTS, but available for future use.
 */

export interface PollyServiceInterface {
  synthesizeSpeech: (text: string, options?: PollyOptions) => Promise<string>;
  speak: (text: string, options?: PollyOptions) => Promise<void>;
  stop: () => Promise<void>;
  isConfigured: () => boolean;
  getStatus: () => any;
}

export interface PollyOptions {
  voice?: string;
  engine?: 'standard' | 'neural';
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}