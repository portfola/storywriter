import { useEffect, useState } from 'react';
// Do we need Platform?
// import { Platform } from 'react-native';
import TranscribeService from '@/services/transcribe';
import HuggingFaceService from '@/services/huggingFaceService';
import { usePolly } from '@/hooks/usePolly';

export interface StorySection {
  pageNumber: number;
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
  title: string;
  content: string | null;
  coverImageUrl: string | null;
  sections: StorySection[];
  currentPage: number; // 0 for cover, 1+ for story pages
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
    title: "My Story",
    content: null,
    coverImageUrl: null,
    sections: [],
    currentPage: 0,
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
      console.log('🔄 Generating story...');
      
      // Get the raw response from Hugging Face
      const rawStoryText = await HuggingFaceService.generateResponse(
        `Create a children's story based on: ${storyState.responses.join(' ')}`
      );

      // Extract the title from the response
      let storyTitle = "My Story"; // Default title
      let storyContent = rawStoryText;

      // Find the index of "Title:" in the text
      const titleIndex = rawStoryText.indexOf('Title:');
      if (titleIndex !== -1) {
        // If "Title:" is found, discard everything before it
        storyContent = rawStoryText.substring(titleIndex);

        // Look for "Title: " marker followed by a line break
        const titleRegex = /Title:\s*(.*?)(?:\n|$)/;
        const titleMatch = rawStoryText.match(titleRegex);
      
        if (titleMatch && titleMatch[1]) {
          storyTitle = titleMatch[1].trim();
          console.log('📚 Extracted title:', storyTitle);
        
          // Remove the title line from the content
          storyContent = storyContent.replace(titleRegex, '').trim();
        } 
      } else {
          console.log('⚠️ No title found, using default');
        }
    
    // Generate a cover image using just the title
    console.log('🖼️ Generating cover image based on title...');
    const coverImagePrompt = `Children's book cover illustration for "${storyTitle}"`;
    const coverImageUrl = await HuggingFaceService.generateImage(coverImagePrompt);
    console.log('✅ Cover image URL:', coverImageUrl ? 'Successfully generated' : 'Failed to generate');
    
    // Split the story content into pages (5-10 sections)
    const storyPages = splitIntoPages(storyContent, 7); // Try to get about 7 pages
    console.log(`📄 Split story into ${storyPages.length} pages`);
    
    // Create page objects with null image URLs (to be generated later)
    const pageObjects = storyPages.map((text, index) => ({
      pageNumber: index + 1,
      text: text,
      imageUrl: index === 0 ? null : null // First page image will be generated when viewed
    }));
    
    // Update the story state
    setStory({
      title: storyTitle,
      content: storyContent, // Keep full content for reference
      coverImageUrl: coverImageUrl,
      sections: pageObjects,
      currentPage: 0 // Start at cover (page 0)
    });
    
    console.log('✅ Initial story generation complete with cover');
    
    // Speak the title
    setTimeout(() => {
      speak(`${storyTitle}.`);
    }, 1000);
    
  } catch (error) {
    console.error("❌ Error generating story:", error);
    alert('Failed to generate story. Please try again.');
  } finally {
    setStoryState((prev) => ({ ...prev, isGenerating: false }));
  }
};

// Helper function to split content into reasonable page-sized chunks
const splitIntoPages = (content: string, targetPageCount: number): string[] => {
  // First try to split by paragraphs
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  // If we have very few paragraphs, we might need to split sentences
  if (paragraphs.length <= targetPageCount / 2) {
    const allText = paragraphs.join(' ');
    // Split by sentences (roughly)
    const sentences = allText.split(/(?<=[.!?])\s+/);
    
    // Group sentences into pages
    const sentencesPerPage = Math.max(2, Math.ceil(sentences.length / targetPageCount));
    const pages: string[] = [];
    
    for (let i = 0; i < sentences.length; i += sentencesPerPage) {
      pages.push(sentences.slice(i, i + sentencesPerPage).join(' '));
    }
    
    return pages;
  }
  
  // If we have more paragraphs than target pages, group them
  if (paragraphs.length > targetPageCount) {
    const paragraphsPerPage = Math.ceil(paragraphs.length / targetPageCount);
    const pages: string[] = [];
    
    for (let i = 0; i < paragraphs.length; i += paragraphsPerPage) {
      pages.push(paragraphs.slice(i, i + paragraphsPerPage).join('\n\n'));
    }
    
    return pages;
  }
  
  // If we have a reasonable number of paragraphs, use them directly
  return paragraphs;
};

// Add this to the useStory hook
const navigateToPage = async (pageIndex: number) => {
  console.log(`Navigation requested to page ${pageIndex}`);
  if (pageIndex < 0 || pageIndex > story.sections.length) {
    console.warn('❌ Invalid page index: ${pageIndex}');
    return;
  }
  
  // Update current page immediately for responsive UX
  setStory(prev => ({
    ...prev,
    currentPage: pageIndex
  }));
  
  // If this is page 0 (cover), no need to generate an image
  if (pageIndex === 0) {
    console.log(`📘 Showing cover page, no image generation needed`);
    return;
  }
  
  // Get the page object
  const pageObject = story.sections[pageIndex - 1]; // Adjust for 0-based index
  
  // If the image is already generated, don't regenerate
  if (pageObject.imageUrl) {
    console.log(`🖼️ Image for page ${pageIndex} already exists`);
    return;
  }
  
  // Generate image for this page
  try {
    console.log(`🖼️ Generating image for page ${pageIndex}...`);
    
    // Use the page text as the prompt
    const imagePrompt = `Children's book illustration for: "${pageObject.text}"`;
    const imageUrl = await HuggingFaceService.generateImage(imagePrompt);
    
    // Update the page object with the new image
    const updatedSections = [...story.sections];
    updatedSections[pageIndex - 1] = {
      ...pageObject,
      imageUrl
    };
    
    // Update the story state
    setStory(prev => ({
      ...prev,
      sections: updatedSections
    }));
    
    console.log(`✅ Image generated for page ${pageIndex}`);
  } catch (error) {
    console.error(`❌ Error generating image for page ${pageIndex}:`, error);
  }
};

// Convenience functions for navigation
const nextPage = () => {
  const nextIndex = story.currentPage + 1;
  if (nextIndex <= story.sections.length) {
    navigateToPage(nextIndex);
  }
};

const previousPage = () => {
  const prevIndex = story.currentPage - 1;
  console.log(`Attempting to navigate from page ${story.currentPage} to page ${prevIndex}`);

  // Make sure we can navigate to the cover (page 0)
  if (prevIndex >= 0) {
    console.log(`Navigating to page ${prevIndex}`);
    navigateToPage(prevIndex);
  } else {
    console.log('Already at the first page, cannot go back further');
  }
};

  return {
    storyState,
    story,
    startListening,
    handleConversationComplete,
    generateStoryWithImages,
    navigateToPage,
    nextPage,
    previousPage
  };
}
