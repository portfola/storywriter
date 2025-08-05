/**
 * AWS Polly Web Service (Optional - Not Currently Used)
 * 
 * This service provides AWS Polly text-to-speech functionality for web platforms.
 * Currently disabled in favor of ElevenLabs TTS, but available for future use.
 */

import { 
  PollyClient, 
  SynthesizeSpeechCommand,
  Engine,
  OutputFormat,
  TextType,
  VoiceId
} from "@aws-sdk/client-polly";
import Constants from 'expo-constants';
import { PollyServiceInterface, PollyOptions } from './types';

class PollyService implements PollyServiceInterface {
  private client: PollyClient;
  private audio: HTMLAudioElement | null = null;

  constructor() {
    const awsConfig = {
      region: Constants.expoConfig?.extra?.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: Constants.expoConfig?.extra?.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: Constants.expoConfig?.extra?.AWS_SECRET_ACCESS_KEY || ''
      }
    };

    // Validate AWS credentials
    if (!awsConfig.credentials.accessKeyId || !awsConfig.credentials.secretAccessKey) {
      console.warn('⚠️ AWS credentials not configured - Polly service will not work');
    }

    this.client = new PollyClient(awsConfig);
  }

  async synthesizeSpeech(text: string, options?: PollyOptions): Promise<string> {
    try {
      if (!Constants.expoConfig?.extra?.AWS_ACCESS_KEY_ID) {
        throw new Error('AWS credentials not configured');
      }

      const params = {
        Text: text,
        OutputFormat: OutputFormat.MP3,
        VoiceId: (options?.voice || VoiceId.Kendra) as VoiceId,
        Engine: (options?.engine || 'neural') as Engine,
        TextType: TextType.TEXT
      };

      const command = new SynthesizeSpeechCommand(params);
      const response = await this.client.send(command);

      if (!response.AudioStream) {
        throw new Error('No audio stream returned from Polly');
      }

      // Convert the binary audio stream to a blob URL
      const blob = new Blob([await response.AudioStream.transformToByteArray()], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      return url;
    } catch (error) {
      console.error('❌ Failed to synthesize speech with Polly:', error);
      throw new Error(`Polly synthesis failed: ${(error as Error).message || 'Unknown error'}`);
    }
  }

  async speak(text: string, options?: PollyOptions): Promise<void> {
    try {
      if (options?.onStart) {
        options.onStart();
      }

      const audioUrl = await this.synthesizeSpeech(text, options);
      
      // Stop any existing audio
      await this.stop();
      
      // Create and play audio
      this.audio = new Audio(audioUrl);
      this.audio.volume = Math.max(0, Math.min(1, options?.volume || 1.0));
      this.audio.playbackRate = Math.max(0.1, Math.min(4, options?.rate || 1.0));
      
      this.audio.onended = () => {
        if (options?.onDone) {
          options.onDone();
        }
        // Clean up the URL object
        URL.revokeObjectURL(audioUrl);
      };
      
      this.audio.onerror = (e) => {
        const error = new Error(`Audio playback error: ${e}`);
        if (options?.onError) {
          options.onError(error);
        }
        URL.revokeObjectURL(audioUrl);
      };
      
      await this.audio.play();
    } catch (error) {
      console.error('❌ Failed to play speech with Polly:', error);
      if (options?.onError) {
        options.onError(error as Error);
      }
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }
  }

  /**
   * Check if Polly service is properly configured
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
  getStatus(): { configured: boolean; region: string | null } {
    return {
      configured: this.isConfigured(),
      region: Constants.expoConfig?.extra?.AWS_REGION || null
    };
  }
}

export default new PollyService();