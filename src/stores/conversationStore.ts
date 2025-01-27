import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StoryPage } from '@/src/utils/storyGenerator';

// Define all possible states of our conversation
export type ConversationPhase = 
  | 'INITIAL'           // App just started; no interaction yet
  | 'INTERVIEWING'      // Asking questions to gather story details
  | 'PROCESSING'        // Analyzing user's response or generating a question
  | 'GENERATING_STORY'  // Creating the story based on collected data
  | 'DISPLAYING_STORY'; // Showing the generated story to the user

// Define the structure of each turn in the conversation
export interface ConversationTurn {
  role: 'system' | 'user' | 'assistant'; // Who said this (system, user, or assistant)?
  content: string;                      // The actual message content
  timestamp: number;                    // When the message was created
}

// Define the structure of a saved story
export interface SavedStory {
  id: string;           // Unique identifier for the story
  title: string;        // Display title for the story
  content: StoryPage[]; // The actual pages of the story
  elements: StoryElements; // Key story elements collected during the conversation
  createdAt: number;    // Timestamp for when the story was saved
}

// Define the structure for story elements (e.g., characters, settings)
export interface StoryElements {
  [key: string]: string; // Key-value pairs for story details
}

// Define the state for speech recognition and text-to-speech
export interface SpeechState {
  isListening: boolean;  // Whether the app is actively listening
  isSpeaking: boolean;   // Whether the app is actively speaking
  speechRate: number;    // Rate of speech for text-to-speech
  speechVolume: number;  // Volume of text-to-speech output
}

// Define the state for managing story display and progression
export interface StoryState {
  currentPageIndex: number;      // Index of the currently displayed story page
  storyPages: StoryPage[];       // List of all generated story pages
  storyElements: StoryElements;  // Collected story elements
  savedStories: SavedStory[];    // List of all saved stories
}

// Combine all states and actions into the complete store state
export interface ConversationState extends SpeechState, StoryState {
  phase: ConversationPhase;                  // Current phase of the app
  conversationHistory: ConversationTurn[];  // Log of the conversation so far
  currentQuestion: string;                  // Current question being asked
  error: string | null;                     // Error message, if any

  // Story management actions
  setStoryPages: (pages: StoryPage[]) => void;       // Set story pages
  setCurrentPage: (index: number) => void;          // Set the current page
  nextPage: () => void;                             // Go to the next story page
  previousPage: () => void;                         // Go to the previous story page
  updateStoryElements: (elements: StoryElements) => void; // Update collected story elements
  saveStory: (title?: string) => Promise<void>;     // Save the current story
  loadStory: (id: string) => Promise<void>;         // Load a saved story
  loadSavedStories: () => Promise<void>;            // Load all saved stories

  // Conversation management actions
  startConversation: () => void;            // Start a new conversation
  addUserResponse: (response: string) => void; // Add a user's response to the conversation
  setQuestion: (question: string) => void;   // Set the next question to ask the user
  setPhase: (phase: ConversationPhase) => void; // Change the app's phase
  setSpeechState: (speechState: Partial<SpeechState>) => void; // Update speech state
  resetConversation: () => void;            // Reset the entire conversation
  setError: (error: string | null) => void; // Set or clear an error
}

// Create the Zustand store for managing the conversation and story state
const useConversationStore = create<ConversationState>()(
  devtools(
    (set, get) => ({
      // Initial state
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

      // Start a new conversation
      startConversation: () => {
        set({
          phase: 'INTERVIEWING',
          conversationHistory: [
            {
              role: 'system',
              content: 'You are a friendly children\'s story creator assistant.',
              timestamp: Date.now(),
            },
          ],
          currentQuestion: 'What kind of story would you like to create today?',
          error: null,
          isListening: false,
          isSpeaking: false,
        });
      },

      // Add a user's response to the conversation
      addUserResponse: (response: string) => {
        const { conversationHistory, phase } = get();

        // Only add a response if in the correct phase
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
              timestamp: Date.now(),
            },
          ],
          phase: 'PROCESSING',
        });
      },

      // Set the next question in the conversation
      setQuestion: (question: string) => {
        const { conversationHistory } = get();

        set({
          currentQuestion: question,
          conversationHistory: [
            ...conversationHistory,
            {
              role: 'assistant',
              content: question,
              timestamp: Date.now(),
            },
          ],
          phase: 'INTERVIEWING',
        });
      },

      // Update the app's phase
      setPhase: (phase: ConversationPhase) => {
        set({ phase });
      },

      // Update speech recognition and TTS state
      setSpeechState: (speechState: Partial<SpeechState>) => {
        set((state) => ({
          ...state,
          ...speechState,
        }));
      },

      // Reset the entire conversation
      resetConversation: () => {
        set({
          phase: 'INITIAL',
          conversationHistory: [],
          currentQuestion: '',
          error: null,
          isListening: false,
          isSpeaking: false,
        });
      },

      // Set or clear an error message
      setError: (error: string | null) => {
        set({ error });
      },

      // Story management actions
      setStoryPages: (pages: StoryPage[]) => {
        set({
          storyPages: pages,
          currentPageIndex: 0, // Reset to the first page
          phase: 'DISPLAYING_STORY',
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
          createdAt: Date.now(),
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
        const story = savedStories.find((s) => s.id === id);

        if (!story) {
          throw new Error('Story not found');
        }

        set({
          storyPages: story.content,
          storyElements: story.elements,
          currentPageIndex: 0,
          phase: 'DISPLAYING_STORY',
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
    }),
  ),
);

export default useConversationStore;
