/**
 * AWS Transcribe Service Types (Optional - Not Currently Used)
 * 
 * These types support AWS Transcribe speech-to-text functionality.
 * Currently disabled in favor of ElevenLabs Conversational AI, but available for future use.
 */

export interface TranscribeServiceInterface {
  startTranscription: (onTranscript: (text: string) => void) => Promise<void>;
  stopTranscription: () => Promise<void>;
  isTranscribing: () => boolean;
  isConfigured: () => boolean;
  getStatus: () => any;
}