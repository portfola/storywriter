<<<<<<< HEAD
import { Platform } from 'react-native';
import { PollyServiceInterface } from './types';
import WebPollyService from './web';
import NativePollyService from './native';

const PollyService: PollyServiceInterface = 
  Platform.select({
    web: () => WebPollyService,
    default: () => NativePollyService,
  })();

=======
import { Platform } from 'react-native';
import { PollyServiceInterface } from './types';
import WebPollyService from './web';
import NativePollyService from './native';

const PollyService: PollyServiceInterface = 
  Platform.select({
    web: () => WebPollyService,
    default: () => NativePollyService,
  })();

>>>>>>> d0d38375c33ffc69da2aef7e4ea672c89c411b46
export default PollyService;