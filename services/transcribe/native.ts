import { TranscribeServiceInterface } from './types';

/**
 * Native implementation of the TranscribeService for iOS/Android
 * 
 * This is a placeholder implementation that will be properly
 * implemented in the future for native platforms.
 */
class NativeTranscribeService implements TranscribeServiceInterface {
  private _isTranscribing: boolean = false;

  async startTranscription(onTranscript: (text: string) => void): Promise<void> {
    console.warn('Native transcription is not yet implemented. Please use web version for now.');
    this._isTranscribing = true;
    
    // This is where you would implement native voice recognition
    // For now, we'll just simulate this with a timeout to avoid blocking
    setTimeout(() => {
      if (this._isTranscribing) {
        onTranscript('Native transcription not implemented yet.');
        this._isTranscribing = false;
      }
    }, 2000);
  }

  async stopTranscription(): Promise<void> {
    console.warn('Stopping native transcription (not fully implemented)');
    this._isTranscribing = false;
    // Future implementation will include stopping the native voice recognition
  }

  isTranscribing(): boolean {
    return this._isTranscribing;
  }
}

// Export a singleton instance as the default export
export default new NativeTranscribeService();