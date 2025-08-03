/**
 * AWS Transcribe Web Service (Optional - Not Currently Used)
 * 
 * This service would provide AWS Transcribe speech-to-text functionality for web platforms.
 * Currently disabled in favor of ElevenLabs Conversational AI, but available for future use.
 * 
 * Note: The full implementation would require AWS SDK and streaming transcription setup.
 */

import { TranscribeServiceInterface } from './types';
import Constants from 'expo-constants';

class TranscribeWebService implements TranscribeServiceInterface {
  private isActive = false;

  async startTranscription(onTranscript: (text: string) => void): Promise<void> {
    if (!Constants.expoConfig?.extra?.AWS_ACCESS_KEY_ID) {
      throw new Error('AWS credentials not configured for Transcribe service');
    }

    console.warn('⚠️ AWS Transcribe web implementation not yet built');
    throw new Error('AWS Transcribe web service not implemented. Use ElevenLabs Conversational AI instead.');
  }

  async stopTranscription(): Promise<void> {
    this.isActive = false;
    console.log('📝 Transcription stopped (placeholder)');
  }

  isTranscribing(): boolean {
    return this.isActive;
  }

  /**
   * Check if Transcribe service is properly configured
   */
  isConfigured(): boolean {
    return !!(
      Constants.expoConfig?.extra?.AWS_ACCESS_KEY_ID &&
      Constants.expoConfig?.extra?.AWS_SECRET_ACCESS_KEY &&
      Constants.expoConfig?.extra?.AWS_REGION
    );
  }

  /**
   * Get service configuration status
   */
  getStatus(): { configured: boolean; active: boolean; platform: string } {
    return {
      configured: this.isConfigured(),
      active: this.isActive,
      platform: 'web (placeholder)'
    };
  }
}

export default new TranscribeWebService();