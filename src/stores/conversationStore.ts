import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StoryPage } from '@/src/utils/storyGenerator';
import TogetherAIService from '@/services/togetherAiService';
import ElevenLabsService from '@/services/elevenLabsService';
import { AudioGenerationResult, ElevenLabsError } from '@/types/elevenlabs';

// Define all possible states of our conversation
export type ConversationPhase = 
  | 'INITIAL'              // Just started, no interaction yet
  | 'CONVERSATION_ACTIVE'  // Actively asking questions and getting responses
  | 'TRANSCRIPT_READY'     // Transcript is ready, can generate story
  | 'STORY_GENERATING'     // Creating the story
  | 'STORY_COMPLETE';      // Story has been generated and is ready

// Define the structure of our conversation turns
export interface ConversationTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// Define what a saved story looks like
export interface SavedStory {
  id: string;           // Unique identifier for the story
  title: string;        // Display title
  content: StoryPage[]; // The actual story pages
  elements: StoryElements; // The gathered story elements
  createdAt: number;    // Timestamp for sorting
}

// Define story elements structure
export interface StoryElements {
  [key: string]: string;
}

// Define story section structure from useStory
export interface StorySection {
  text: string;
  imageUrl: string | null;
}

// Define story content structure from useStory
export interface StoryContent {
  content: string | null;
  sections: StorySection[];
}

// Define what information we need to track about speech
export interface SpeechState {
  isListening: boolean;
  isSpeaking: boolean;
  speechRate: number;
  speechVolume: number;
}

// Define our story state
export interface StoryState {
  currentPageIndex: number;
  storyPages: StoryPage[];
  storyElements: StoryElements;
  savedStories: SavedStory[];
}

// Define our complete store state shape
export interface ConversationState extends SpeechState, StoryState {
  phase: ConversationPhase;
  conversationHistory: ConversationTurn[];
  currentQuestion: string;
  transcript: string;
  error: string | null;
  
  // New unified story state from useStory
  responses: string[];
  conversationComplete: boolean;
  isGenerating: boolean;
  storyContent: StorySection[];
  generatedStory: string | null;
  isGeneratingAudio: boolean;
  audioError: string | null;
  story: StoryContent;
  
  // Story management actions
  setStoryPages: (pages: StoryPage[]) => void;
  setCurrentPage: (index: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  updateStoryElements: (elements: StoryElements) => void;
  saveStory: (title?: string) => Promise<void>;
  loadStory: (id: string) => Promise<void>;
  loadSavedStories: () => Promise<void>;
  
  // Existing conversation actions
  startConversation: () => void;
  addUserResponse: (response: string) => void;
  setQuestion: (question: string) => void;
  setPhase: (phase: ConversationPhase) => void;
  setSpeechState: (speechState: Partial<SpeechState>) => void;
  resetConversation: () => void;
  setError: (error: string | null) => void;
  
  // New actions from useStory
  handleConversationComplete: (transcript: string) => void;
  generateStoryWithImages: () => Promise<void>;
  generateStoryPromptAudio: (prompt: string) => Promise<AudioGenerationResult | null>;
  generateStoryAudio: (storyText: string) => Promise<AudioGenerationResult | null>;
}

const useConversationStore = create<ConversationState>()(
  devtools(
    (set, get) => ({
      phase: 'INITIAL',
      conversationHistory: [],
      currentQuestion: 'What kind of story shall we create together?',
      transcript: '',
      error: null,
      isListening: false,
      isSpeaking: false,
      speechRate: 1.0,
      speechVolume: 1.0,
      currentPageIndex: 0,
      storyPages: [],
      storyElements: {},
      savedStories: [],
      
      // New unified story state from useStory
      responses: [],
      conversationComplete: false,
      isGenerating: false,
      storyContent: [],
      generatedStory: null,
      isGeneratingAudio: false,
      audioError: null,
      story: {
        content: null,
        sections: [],
      },
      
      // Actions are simplified to avoid nested updates
      startConversation: () => {
        set({
          phase: 'CONVERSATION_ACTIVE',
          conversationHistory: [{
            role: 'system',
            content: 'You are a friendly children\'s story creator assistant.',
            timestamp: Date.now()
          }],
          currentQuestion: 'What kind of story shall we create together?',
          error: null,
          isListening: false,
          isSpeaking: false,
          responses: [],
          conversationComplete: false,
          transcript: ''
        });
      },

      addUserResponse: (response: string) => {
        const { conversationHistory, phase, responses } = get();
        
        // Only add response if we're in the right phase
        if (phase !== 'CONVERSATION_ACTIVE') {
          console.warn('Attempted to add user response in invalid phase:', phase);
          return;
        }

        set({
          conversationHistory: [
            ...conversationHistory,
            {
              role: 'user',
              content: response,
              timestamp: Date.now()
            }
          ],
          responses: [...responses, response]
        });
      },

      setQuestion: (question: string) => {
        const { conversationHistory } = get();
        
        set({
          currentQuestion: question,
          conversationHistory: [
            ...conversationHistory,
            {
              role: 'assistant',
              content: question,
              timestamp: Date.now()
            }
          ],
          phase: 'CONVERSATION_ACTIVE'
        });
      },

      setPhase: (phase: ConversationPhase) => {
        set({ phase });
      },

      setSpeechState: (speechState: Partial<SpeechState>) => {
        set((state) => ({
          ...state,
          ...speechState
        }));
      },

      resetConversation: () => {
        set({
          phase: 'INITIAL',
          conversationHistory: [],
          currentQuestion: 'What kind of story shall we create together?',
          transcript: '',
          error: null,
          isListening: false,
          isSpeaking: false,
          responses: [],
          conversationComplete: false,
          isGenerating: false,
          storyContent: [],
          generatedStory: null,
          isGeneratingAudio: false,
          audioError: null,
          story: {
            content: null,
            sections: [],
          }
        });
      },

      setError: (error: string | null) => {
        set({ error });
      },
      // Story management actions
      setStoryPages: (pages: StoryPage[]) => {
        set({
          storyPages: pages,
          currentPageIndex: 0,  // Reset to first page when setting new pages
          phase: 'STORY_COMPLETE'
        });
      },

      setCurrentPage: (index: number) => {
        const { storyPages } = get();
        if (index >= 0 && index < storyPages.length) {
          set({ currentPageIndex: index });
        }
      },

      nextPage: () => {
        const { currentPageIndex, storyPages } = get();
        if (currentPageIndex < storyPages.length - 1) {
          set({ currentPageIndex: currentPageIndex + 1 });
        }
      },

      previousPage: () => {
        const { currentPageIndex } = get();
        if (currentPageIndex > 0) {
          set({ currentPageIndex: currentPageIndex - 1 });
        }
      },

      updateStoryElements: (elements: StoryElements) => {
        set({ storyElements: elements });
      },

      saveStory: async (title?: string) => {
        const { storyPages, storyElements, savedStories } = get();
        
        if (storyPages.length === 0) {
          throw new Error('No story to save');
        }

        const newStory: SavedStory = {
          id: Date.now().toString(),
          title: title || `Story Created on ${new Date().toLocaleDateString()}`,
          content: storyPages,
          elements: storyElements,
          createdAt: Date.now()
        };

        const updatedStories = [...savedStories, newStory];
        
        try {
          await AsyncStorage.setItem('savedStories', JSON.stringify(updatedStories));
          set({ savedStories: updatedStories });
        } catch (error) {
          console.error('Failed to save story:', error);
          throw new Error('Failed to save story');
        }
      },

      loadStory: async (id: string) => {
        const { savedStories } = get();
        const story = savedStories.find(s => s.id === id);
        
        if (!story) {
          throw new Error('Story not found');
        }

        set({
          storyPages: story.content,
          storyElements: story.elements,
          currentPageIndex: 0,
          phase: 'STORY_COMPLETE'
        });
      },

      loadSavedStories: async () => {
        try {
          const stored = await AsyncStorage.getItem('savedStories');
          if (stored) {
            const stories = JSON.parse(stored);
            set({ savedStories: stories });
          }
        } catch (error) {
          console.error('Failed to load saved stories:', error);
          throw new Error('Failed to load saved stories');
        }
      },
      
      // New actions from useStory
      handleConversationComplete: (transcript: string) => {
        set({
          responses: [transcript],
          transcript,
          isListening: false,
          conversationComplete: true,
          phase: 'TRANSCRIPT_READY'
        });
      },

      generateStoryWithImages: async () => {
        const { responses } = get();
        set({ isGenerating: true, phase: 'STORY_GENERATING' });

        try {
          const { text: rawStoryText, imageUrl } = await TogetherAIService.generateResponse(
            `Create a children's story based on: ${responses.join(' ')}`
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
          set({
            story: {
              content: processedStoryText,
              sections: [{ text: processedStoryText, imageUrl }],
            },
            generatedStory: processedStoryText,
            storyContent: [{ text: processedStoryText, imageUrl }],
            phase: 'STORY_COMPLETE'
          });
        } catch (error) {
          console.error('❌ Error generating story:', error);
          set({ error: 'Failed to generate story. Please try again.' });
        } finally {
          set({ isGenerating: false });
        }
      },

      generateStoryPromptAudio: async (prompt: string): Promise<AudioGenerationResult | null> => {
        set({ 
          isGeneratingAudio: true, 
          audioError: null 
        });

        try {
          const audioResult = await ElevenLabsService.generateStoryPromptSpeech(prompt);
          console.log('✅ Story prompt audio generated successfully');
          return audioResult;
        } catch (error) {
          const elevenlabsError = error as ElevenLabsError;
          console.error('❌ Failed to generate story prompt audio:', elevenlabsError.message);
          
          set({ 
            audioError: elevenlabsError.message || 'Failed to generate audio' 
          });
          
          return null;
        } finally {
          set({ isGeneratingAudio: false });
        }
      },

      generateStoryAudio: async (storyText: string): Promise<AudioGenerationResult | null> => {
        set({ 
          isGeneratingAudio: true, 
          audioError: null 
        });

        try {
          const audioResult = await ElevenLabsService.generateSpeech(storyText);
          console.log('✅ Story audio generated successfully');
          return audioResult;
        } catch (error) {
          const elevenlabsError = error as ElevenLabsError;
          console.error('❌ Failed to generate story audio:', elevenlabsError.message);
          
          set({ 
            audioError: elevenlabsError.message || 'Failed to generate audio' 
          });
          
          return null;
        } finally {
          set({ isGeneratingAudio: false });
        }
      }
    })
  )
);

export { useConversationStore };