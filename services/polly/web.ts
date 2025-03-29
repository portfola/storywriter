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
      this.client = new PollyClient({
        region: Constants.expoConfig?.extra?.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: Constants.expoConfig?.extra?.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: Constants.expoConfig?.extra?.AWS_SECRET_ACCESS_KEY || ''
        }
      });
    }
  
    async synthesizeSpeech(text: string, options?: PollyOptions): Promise<string> {
      try {
        const params = {
          Text: text,
          OutputFormat: OutputFormat.MP3,
          VoiceId: (options?.voice || VoiceId.Kendra) as VoiceId,
          Engine: options?.engine || 'neural',
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
        console.error('Failed to synthesize speech:', error);
        throw error;
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
        this.audio.volume = options?.volume || 1.0;
        this.audio.playbackRate = options?.rate || 1.0;
        
        this.audio.onended = () => {
          if (options?.onDone) {
            options.onDone();
          }
          // Clean up the URL object
          URL.revokeObjectURL(audioUrl);
        };
        
        this.audio.onerror = (e) => {
          if (options?.onError) {
            options.onError(new Error(`Audio playback error: ${e}`));
          }
          URL.revokeObjectURL(audioUrl);
        };
        
        await this.audio.play();
      } catch (error) {
        console.error('Failed to play speech:', error);
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
  }
  
  export default new PollyService();