import { useCallback } from 'react';
import { shallow } from 'zustand/shallow';
import Polly from '@/services/polly/polly-wrapper';
import { useConversationStore } from '@/src/stores/conversationStore';

export function usePolly() {
  const setSpeechState = useConversationStore(state => state.setSpeechState);
  const setError = useConversationStore(state => state.setError);
  const speechRate = useConversationStore(state => state.speechRate);
  const speechVolume = useConversationStore(state => state.speechVolume);

  const speak = useCallback((text: string, customOptions = {}) => {
    return Polly.speak(text, {
      rate: speechRate,
      volume: speechVolume,
      onStart: () => setSpeechState({ isSpeaking: true }),
      onDone: () => setSpeechState({ isSpeaking: false }),
      onError: (error) => {
        setSpeechState({ isSpeaking: false });
        setError(`Failed to speak: ${error.message}`);
      },
      ...customOptions
    });
  }, [speechRate, speechVolume, setSpeechState, setError]);

  const stop = useCallback(() => {
    Polly.stop();
    setSpeechState({ isSpeaking: false });
  }, [setSpeechState]);

  return { speak, stop };
}