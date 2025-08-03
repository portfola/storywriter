/**
 * AWS Transcribe Native Service (Optional - Not Currently Used)
 * 
 * This service would provide AWS Transcribe speech-to-text functionality for native platforms.
 * Currently disabled in favor of ElevenLabs Conversational AI, but available for future use.
 */

import { TranscribeServiceInterface } from './types';

class TranscribeNativeService implements TranscribeServiceInterface {
  private isActive = false;

  async startTranscription(onTranscript: (text: string) => void): Promise<void> {
    console.warn('⚠️ AWS Transcribe native implementation not yet built');
    throw new Error('AWS Transcribe native service not implemented. Use ElevenLabs Conversational AI instead.');
  }

  async stopTranscription(): Promise<void> {
    this.isActive = false;
    console.log('📝 Transcription stopped (placeholder)');
  }

  isTranscribing(): boolean {
    return this.isActive;
  }

  /**
   * Check if native Transcribe service is available
   */
  isConfigured(): boolean {
    return false; // Native implementation not built yet
  }

  /**
   * Get service configuration status
   */
  getStatus(): { configured: boolean; active: boolean; platform: string } {
    return {
      configured: false,
      active: this.isActive,
      platform: 'native (not implemented)'
    };
  }
}

export default new TranscribeNativeService();