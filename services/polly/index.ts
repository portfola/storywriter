import { Platform } from 'react-native';
import { PollyServiceInterface } from './types';
import WebPollyService from './web';
import NativePollyService from './native';

const PollyService: PollyServiceInterface = 
  Platform.select({
    web: () => WebPollyService,
    default: () => NativePollyService,
  })();

export default PollyService;