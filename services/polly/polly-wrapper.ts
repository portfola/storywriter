import PollyService from './index';

// Define types for the options
type SpeakOptions = {
  voice?: string;
  engine?: 'standard' | 'neural';
  rate?: number;
  volume?: number;
  onStart?: () => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
};

const Polly = {
  speak: async (text: string, options: SpeakOptions = {}) => {
    try {
      const defaultOptions = {
        voice: 'Kendra',
        engine: 'neural' as const,
        rate: 1.0,
        volume: 1.0,
        onStart: () => {},
        onDone: () => {},
        onError: (error: Error) => { console.error(error); }
      };
      
      // Combine default options with provided options
      const mergedOptions = { ...defaultOptions, ...options };
      
      return await PollyService.speak(text, mergedOptions);
    } catch (error) {
      console.error('Polly speak error:', error);
      if (options.onError) {
        options.onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  },
  
  stop: async () => {
    try {
      await PollyService.stop();
    } catch (error) {
      console.error('Polly stop error:', error);
    }
  }
};

export default Polly;