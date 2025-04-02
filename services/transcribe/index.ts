import { Platform } from 'react-native';
import { TranscribeServiceInterface } from './types';
import WebTranscribeService from './web';
import NativeTranscribeService from './native';

// Use a simpler approach to select the right implementation based on platform
const TranscribeService: TranscribeServiceInterface = 
  Platform.OS === 'web' ? WebTranscribeService : NativeTranscribeService;

export default TranscribeService;