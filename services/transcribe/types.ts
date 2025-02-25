export interface TranscribeServiceInterface {
    startTranscription: (onTranscript: (text: string) => void) => Promise<void>;
    stopTranscription: () => Promise<void>;
    isTranscribing: () => boolean;
  }