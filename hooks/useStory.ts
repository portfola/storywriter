import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import TranscribeService from '@/services/transcribe';
import HuggingFaceService from '@/services/huggingFaceService';
import { usePolly } from '@/hooks/usePolly';

export interface StorySection {
  text: string;
  imageUrl: string | null;
}

export interface StoryState {
  question: string;
  responses: string[];
  isListening: boolean;
  conversationComplete: boolean;
  isGenerating: boolean;
  storyContent: StorySection[];
  generatedStory: string | null;
}

export interface StoryContent {
  content: string | null;
  sections: StorySection[];
}

/**
 * useStory Hook
 *
 * Manages the full story creation flow including:
 * - Voice input handling (start/stop listening)
 * - Question prompting and state transitions
 * - AI-based story and image generation
 * - Polly speech output and cleanup
 *
 * Combines state and behavior for:
 * - User responses
 * - Listening & generation status
 * - Final story output and image
 *
 * @returns {
*   storyState: {
*     question: string,
*     responses: string[],
*     isListening: boolean,
*     conversationComplete: boolean,
*     isGenerating: boolean,
*     storyContent: StorySection[],
*     generatedStory: string | null,
*   },
*   story: {
*     content: string | null,
*     sections: StorySection[]
*   },
*   startListening: () => void,
*   handleConversationComplete: () => void,
*   generateStoryWithImages: () => Promise<void>
* }
*/
export function useStory() {
  const { speak, stop } = usePolly();

  const [storyState, setStoryState] = useState<StoryState>({
    question: 'What kind of story shall we create together?',
    responses: [],
    isListening: false,
    conversationComplete: false,
    isGenerating: false,
    storyContent: [],
    generatedStory: null,
  });

  const [story, setStory] = useState<StoryContent>({
    content: null,
    sections: [],
  });

  // Update question dynamically
  useEffect(() => {
    if (!storyState.conversationComplete) {
      const questionText =
        storyState.responses.length > 0 ? 'OK, and what else?' : 'What kind of story shall we create together?';

      stop();
      setTimeout(() => speak(questionText), 3000);
      setStoryState((prev) => ({ ...prev, question: questionText }));
    }
  }, [storyState.responses, storyState.conversationComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const startListening = async () => {
    try {
      setStoryState((prev) => ({ ...prev, isListening: true }));
      stop();

      await TranscribeService.startTranscription((transcript) => {
        const isDone = ['i\'m done', 'that\'s all', 'finish'].some((phrase) =>
          transcript.toLowerCase().includes(phrase),
        );

        if (isDone) {
          TranscribeService.stopTranscription();
          setStoryState((prev) => ({ ...prev, conversationComplete: true }));
          speak("Okay! Let's create our story.");
        } else {
          setStoryState((prev) => ({
            ...prev,
            responses: [...prev.responses, transcript],
          }));
        }
      });
    } catch (error) {
      console.error('Transcription error:', error);
      alert('Failed to start listening. Please try again.');
    }
  };

  const handleConversationComplete = () => {
    TranscribeService.stopTranscription();
    setStoryState((prev) => ({
      ...prev,
      isListening: false,
      conversationComplete: true,
    }));

    setTimeout(() => {
      speak("Okay! I will now create your story.");
    }, 2000);
  };

  const generateStoryWithImages = async () => {
    stop();
    setStoryState((prev) => ({ ...prev, isGenerating: true }));

    try {
      const storyText = await HuggingFaceService.generateResponse(
        `Create a children's story based on: ${storyState.responses.join(' ')}`
      );

      setStory((prev) => ({ ...prev, content: storyText }));

      const imageUrl = await HuggingFaceService.generateImage(storyText);

      setStory({
        content: storyText,
        sections: [{ text: storyText, imageUrl }],
      });

      // Add a slight delay to ensure UI updates first
      setTimeout(() => {
        speak(storyText);
      }, 1000);
    } catch (error) {
      console.error('❌ Error generating story:', error);
      alert('Failed to generate story. Please try again.');
    } finally {
      setStoryState((prev) => ({ ...prev, isGenerating: false }));
    }
  };

  return {
    storyState,
    story,
    startListening,
    handleConversationComplete,
    generateStoryWithImages,
  };
}
