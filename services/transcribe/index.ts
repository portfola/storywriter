/**
 * AWS Transcribe Service Platform Selector (Optional - Not Currently Used)
 * 
 * This service automatically selects the appropriate Transcribe implementation based on platform.
 * Currently disabled in favor of ElevenLabs Conversational AI, but available for future use.
 */

import { Platform } from 'react-native';
import TranscribeWebService from './web';
import TranscribeNativeService from './native';

// Export the appropriate service based on platform
export default Platform.OS === 'web' ? TranscribeWebService : TranscribeNativeService;