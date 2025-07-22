import { useState } from 'react';
import TogetherAIService from '@/services/togetherAiService';
import ElevenLabsService from '@/services/elevenLabsService';

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

export function useStory() {
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

  // Function to start ElevenLabs conversation (placeholder)
  // const startElevenLabsConversation = () => {
  //   console.log('Starting StoryWriter Agent conversation...');
  //   ElevenLabsService.startConversation(handleConversationComplete);
  // };

  // Handle when ElevenLabs conversation is complete
  const handleConversationComplete = (transcript: string) => {
    setStoryState((prev) => ({
      ...prev,
      responses: [transcript],
      isListening: false,
      conversationComplete: true,
    }));
  };

  const generateStoryWithImages = async () => {
    setStoryState((prev) => ({ ...prev, isGenerating: true }));

    try {
      const { text: rawStoryText, imageUrl } = await TogetherAIService.generateResponse(
        `Create a children's story based on: ${storyState.responses.join(' ')}`
      );

      // Process story text (remove prompt if needed)
      let processedStoryText = rawStoryText;

      // Look for "Title: " as the marker to start the actual story
      const titleIndex = rawStoryText.indexOf("Title: ");
      if (titleIndex !== -1) {
        // Found the title marker, extract everything from this point onward
        processedStoryText = rawStoryText.substring(titleIndex + 7);
      }

      // Update the story state with the processed content
      setStory({
        content: processedStoryText,
        sections: [{ text: processedStoryText, imageUrl }],
      });
    } catch (error) {
      console.error('❌ Error generating story:', error);
      alert('Failed to generate story. Please try again.');
    } finally {
      setStoryState(prev => ({ ...prev, isGenerating: false }));
    }
  };

  return {
    storyState,
    story,
    // startElevenLabsConversation,
    handleConversationComplete,
    generateStoryWithImages,
  };
}
