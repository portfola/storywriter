import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StoryPage } from '@/src/utils/storyGenerator';

// Define all possible states of our conversation
export type ConversationPhase = 
  | 'INITIAL'           // Just started, no interaction yet
  | 'INTERVIEWING'      // Actively asking questions
  | 'PROCESSING'        // Processing user's response
  | 'GENERATING_STORY'  // Creating the story
  | 'DISPLAYING_STORY'; // Showing the generated story

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
  error: string | null;
  
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
}

const useConversationStore = create<ConversationState>()(
  devtools(
    (set, get) => ({
      phase: 'INITIAL',
      conversationHistory: [],
      currentQuestion: '',
      error: null,
      isListening: false,
      isSpeaking: false,
      speechRate: 1.0,
      speechVolume: 1.0,
      currentPageIndex: 0,
      storyPages: [],
      storyElements: {},
      savedStories: [],
      
      // Actions are simplified to avoid nested updates
      startConversation: () => {
        set({
          phase: 'INTERVIEWING',
          conversationHistory: [{
            role: 'system',
            content: 'You are a friendly children\'s story creator assistant.',
            timestamp: Date.now()
          }],
          currentQuestion: 'What kind of story would you like to create today?',
          error: null,
          isListening: false,
          isSpeaking: false
        });
      },

      addUserResponse: (response: string) => {
        const { conversationHistory, phase } = get();
        
        // Only add response if we're in the right phase
        if (phase !== 'INTERVIEWING' && phase !== 'PROCESSING') {
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
          phase: 'PROCESSING'
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
          phase: 'INTERVIEWING'
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
          currentQuestion: '',
          error: null,
          isListening: false,
          isSpeaking: false
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
          phase: 'DISPLAYING_STORY'
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
          phase: 'DISPLAYING_STORY'
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
      }
    })
  )
);

export { useConversationStore };