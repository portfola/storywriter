/**
 * AWS Polly Native Service (Optional - Not Currently Used)
 * 
 * This service would provide AWS Polly text-to-speech functionality for native platforms.
 * Currently a placeholder - native implementation not yet built.
 */

import { PollyServiceInterface, PollyOptions } from './types';

class NativePollyService implements PollyServiceInterface {
  async synthesizeSpeech(text: string, options?: PollyOptions): Promise<string> {
    console.warn('⚠️ Native Polly implementation not yet available');
    throw new Error('Native Polly implementation not yet available. Use ElevenLabs service instead.');
  }

  async speak(text: string, options?: PollyOptions): Promise<void> {
    console.warn('⚠️ Native Polly implementation not yet available');
    throw new Error('Native Polly implementation not yet available. Use ElevenLabs service instead.');
  }

  async stop(): Promise<void> {
    console.warn('⚠️ Native Polly implementation not yet available');
  }

  /**
   * Check if native Polly service is available
   */
  isConfigured(): boolean {
    return false; // Native implementation not built yet
  }

  /**
   * Get service configuration status
   */
  getStatus(): { configured: boolean; platform: string } {
    return {
      configured: false,
      platform: 'native (not implemented)'
    };
  }
}

export default new NativePollyService();