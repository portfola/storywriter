<<<<<<< HEAD
export interface PollyServiceInterface {
    synthesizeSpeech: (text: string, options?: PollyOptions) => Promise<string>;
    speak: (text: string, options?: PollyOptions) => Promise<void>;
    stop: () => Promise<void>;
  }
  
  export interface PollyOptions {
    voice?: string;
    engine?: 'standard' | 'neural';
    rate?: number;
    pitch?: number;
    volume?: number;
    onStart?: () => void;
    onDone?: () => void;
    onError?: (error: Error) => void;
=======
export interface PollyServiceInterface {
    synthesizeSpeech: (text: string, options?: PollyOptions) => Promise<string>;
    speak: (text: string, options?: PollyOptions) => Promise<void>;
    stop: () => Promise<void>;
  }
  
  export interface PollyOptions {
    voice?: string;
    engine?: 'standard' | 'neural';
    rate?: number;
    pitch?: number;
    volume?: number;
    onStart?: () => void;
    onDone?: () => void;
    onError?: (error: Error) => void;
>>>>>>> d0d38375c33ffc69da2aef7e4ea672c89c411b46
  }