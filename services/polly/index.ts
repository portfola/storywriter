/**
 * AWS Polly Service Platform Selector (Optional - Not Currently Used)
 * 
 * This service automatically selects the appropriate Polly implementation based on platform.
 * Currently disabled in favor of ElevenLabs TTS, but available for future use.
 */

import { Platform } from 'react-native';
import WebPollyService from './web';
import NativePollyService from './native';

// Export the appropriate service based on platform
export default Platform.OS === 'web' ? WebPollyService : NativePollyService;