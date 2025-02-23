import { Platform } from 'react-native';
import { TranscribeServiceInterface } from './types';
import WebTranscribeService from './web';
import NativeTranscribeService from './native';

const TranscribeService: TranscribeServiceInterface = 
  Platform.select({
    web: () => WebTranscribeService,
    default: () => NativeTranscribeService,
  })();

export default TranscribeService;