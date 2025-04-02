import { 
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
  StartStreamTranscriptionCommandInput,
  TranscriptEvent,
  AudioStream
} from "@aws-sdk/client-transcribe-streaming";
import Constants from 'expo-constants';
import { TranscribeServiceInterface } from './types';


class ChromeTestTranscribeService implements TranscribeServiceInterface {
  private client: TranscribeStreamingClient;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private _isTranscribing: boolean = false;
  private audioContext: AudioContext | null = null;
  private audioProcessor: ScriptProcessorNode | null = null;
  private audioChunks: Uint8Array[] = [];
  private readonly SAMPLE_RATE = 16000;
  private readonly CHUNK_SIZE = 4096;

  constructor() {
    console.warn('ChromeTestTranscribeService: This is a test implementation for Chrome browser only.');

  //  console.log('Config: ', Config.AWS_ACCESS_KEY_ID);

    this.client = new TranscribeStreamingClient({
      region: Constants.expoConfig?.extra?.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: Constants.expoConfig?.extra?.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: Constants.expoConfig?.extra?.AWS_SECRET_ACCESS_KEY || ''
      }
    });

    // // Debug AWS configuration
    // console.log('AWS Config:', {
    //   region: Constants.expoConfig?.extra?.AWS_REGION,
    //   hasAccessKey: !!Constants.expoConfig?.extra?.AWS_ACCESS_KEY_ID,
    //   hasSecretKey: !!Constants.expoConfig?.extra?.AWS_SECRET_ACCESS_KEY
    // });
  }

  private isChromeEnvironment(): boolean {
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    if (!isChrome) {
      console.error('ChromeTestTranscribeService: This service only works in Chrome browser.');
    }
    return isChrome;
  }

  private async setupAudioCapture(): Promise<MediaStream> {
    if (!this.isChromeEnvironment()) {
      throw new Error('This test implementation only works in Chrome browser');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: this.SAMPLE_RATE,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      return stream;
    } catch (error) {
      console.error('TEST MODE - Microphone Error:', error);
      throw new Error('Microphone access failed in test mode');
    }
  }

  private async setupAudioProcessing(stream: MediaStream) {
    try {
      // Initialize Web Audio API components
      this.audioContext = new AudioContext({
        sampleRate: this.SAMPLE_RATE,
        latencyHint: 'interactive'
      });
      
      const source = this.audioContext.createMediaStreamSource(stream);
      this.audioProcessor = this.audioContext.createScriptProcessor(
        this.CHUNK_SIZE, // Buffer size
        1, // Input channels
        1  // Output channels
      );

      // console.log('TEST MODE - Audio processing setup:', {
      //   sampleRate: this.audioContext.sampleRate,
      //   bufferSize: this.CHUNK_SIZE
      // });

      // Process audio data
      this.audioProcessor.onaudioprocess = (e) => {
        if (!this._isTranscribing) return;

        const inputData = e.inputBuffer.getChannelData(0);
        
        // Debug audio levels
        const audioLevel = Math.max(...inputData.map(Math.abs));
        if (audioLevel > 0.01) {  // Only log when there's significant audio
          // console.log('TEST MODE - Audio level:', audioLevel.toFixed(3));
        }
        
        // Convert Float32Array to Int16Array (AWS Transcribe format)
        const audioData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          // Scale and clamp the audio samples
          const s = Math.max(-1, Math.min(1, inputData[i]));
          audioData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Debug chunk size
        // console.log('TEST MODE - Created audio chunk:', audioData.length, 'samples');

        // Push the processed audio chunk
        this.audioChunks.push(new Uint8Array(audioData.buffer));
        // console.log('TEST MODE - Audio chunks buffer size:', this.audioChunks.length);
      };

      // Connect the audio nodes
      source.connect(this.audioProcessor);
      this.audioProcessor.connect(this.audioContext.destination);

      // console.log('TEST MODE - Audio processing pipeline established');
    } catch (error) {
      console.error('TEST MODE - Audio processing setup error:', error);
      throw error;
    }
  }

  async startTranscription(onTranscript: (text: string) => void): Promise<void> {
    // console.log('TEST MODE - Starting transcription in Chrome test environment');
    
    if (!this.isChromeEnvironment()) return;

    if (this._isTranscribing) {
      // console.warn('TEST MODE - Transcription already in progress');
      return;
    }

    try {
      this._isTranscribing = true;
      this.stream = await this.setupAudioCapture();
      await this.setupAudioProcessing(this.stream);

      // Create an async generator for audio streaming
      const audioStreamGenerator = async function* (this: ChromeTestTranscribeService) {
        // console.log('TEST MODE - Starting audio stream');
        let chunkCount = 0;
        
        while (this._isTranscribing) {
          if (this.audioChunks.length > 0) {
            const chunk = this.audioChunks.shift();
            if (chunk) {
              chunkCount++;
              // console.log('TEST MODE - Sending chunk #', chunkCount, 'to AWS');
              yield { AudioEvent: { AudioChunk: chunk } } as AudioStream;
            }
          }
          await new Promise(resolve => setTimeout(resolve, 20)); // Reduced delay for smoother streaming
        }
      }.bind(this);

      const params: StartStreamTranscriptionCommandInput = {
        LanguageCode: 'en-US',
        MediaEncoding: 'pcm',
        MediaSampleRateHertz: this.SAMPLE_RATE,
        AudioStream: audioStreamGenerator(),
        EnablePartialResultsStabilization: true,
        PartialResultsStability: 'high',
        ShowSpeakerLabel: false // Control speaker identification
      };

      // console.log('TEST MODE - Starting AWS Transcribe streaming with params:', params);

      const command = new StartStreamTranscriptionCommand(params);
      const response = await this.client.send(command);

      // console.log('TEST MODE - AWS Response:', response);
      
      if (!response.TranscriptResultStream) {
        console.error('TEST MODE - No TranscriptResultStream in response');
        return;
      }

      try {
        for await (const event of response.TranscriptResultStream) {
          // console.log('TEST MODE - Raw stream event:', JSON.stringify(event, null, 2));
          
          // AWS Transcribe events come in a specific shape
          const transcriptEvent = event as TranscriptEvent;
          
          // @ts-ignore - AWS SDK types don't match actual response structure
          if (!transcriptEvent.TranscriptEvent?.Transcript) {
            console.log('TEST MODE - No transcript in event');
            continue;
          }

          // @ts-ignore - AWS SDK types don't match actual response structure
          const results = transcriptEvent.TranscriptEvent.Transcript.Results;
          if (!results || results.length === 0) {
            console.log('TEST MODE - No results in transcript');
            continue;
          }

          // Log the full results for debugging
          // console.log('TEST MODE - Full results:', JSON.stringify(results, null, 2));

          // Get the transcript from the first result's first alternative
          const result = results[0];
          if (result.IsPartial === false && result.Alternatives && result.Alternatives.length > 0) {
            const transcript = result.Alternatives[0].Transcript;
            if (transcript) {
              console.log('TEST MODE - Final transcript received:', transcript);
              onTranscript(transcript.trim());
            }
          }
        }
      } catch (streamError) {
        console.error('TEST MODE - Error processing stream:', streamError);
        throw streamError;
      }
    } catch (error) {
      console.error('TEST MODE - Transcription error:', error);
      await this.stopTranscription();
      throw error;
    }
  }

  async stopTranscription(): Promise<void> {
    // console.log('TEST MODE - Stopping transcription');
    
    try {
      this._isTranscribing = false;

      // Clean up audio processing
      if (this.audioProcessor) {
        this.audioProcessor.disconnect();
        this.audioProcessor = null;
      }

      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }

      // Clean up media resources
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }

      this.audioChunks = [];
      console.log('TEST MODE - Cleanup completed');
    } catch (error) {
      console.error('TEST MODE - Error stopping:', error);
      throw error;
    }
  }

  isTranscribing(): boolean {
    return this._isTranscribing;
  }
}

export default new ChromeTestTranscribeService();