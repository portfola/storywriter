import { PollyServiceInterface, PollyOptions } from './types';

class NativePollyService implements PollyServiceInterface {
  async synthesizeSpeech(text: string, options?: PollyOptions): Promise<string> {
    console.warn('Native Polly implementation not yet available');
    throw new Error('Native Polly implementation not yet available');
  }

  async speak(text: string, options?: PollyOptions): Promise<void> {
    console.warn('Native Polly implementation not yet available');
    throw new Error('Native Polly implementation not yet available');
  }

  async stop(): Promise<void> {
    console.warn('Native Polly implementation not yet available');
  }
}

export default new NativePollyService();