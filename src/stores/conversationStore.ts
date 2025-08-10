import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StoryPage } from '@/types/story';
import ElevenLabsService from '@/services/elevenLabsService';
import StoryGenerationService from '@/services/storyGenerationService';
import { AudioGenerationResult, ElevenLabsError } from '@/types/elevenlabs';
import { TranscriptNormalizer, DialogueTurn } from '@/src/utils/transcriptNormalizer';
import { ErrorHandler, ErrorType, ErrorSeverity, AppError } from '@/src/utils/errorHandler';
import { logger, audioLogger, LogCategory } from '@/src/utils/logger';

// Define all possible states of our conversation - enhanced for better conversation management
export type ConversationPhase = 
  | 'INITIAL'                // Just started, no interaction yet
  | 'CONVERSATION_ACTIVE'    // Actively talking with the agent
  | 'CONVERSATION_ENDED'     // Conversation ended, transcript captured
  | 'TRANSCRIPT_PROCESSING'  // Processing and normalizing transcript
  | 'STORY_GENERATING'       // Creating the story
  | 'STORY_COMPLETE';        // Story has been generated and is ready

// Define the structure of our conversation turns - enhanced for dialogue management
export interface ConversationTurn {
  role: 'system' | 'user' | 'assistant' | 'agent';
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

// Define story section structure
export interface StorySection {
  text: string;
  imageUrl: string | null;
}

// Define story content structure
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

// Define our complete store state shape - enhanced with structured dialogue
export interface ConversationState extends SpeechState, StoryState {
  phase: ConversationPhase;
  conversationHistory: ConversationTurn[];
  dialogue: DialogueTurn[]; // Structured dialogue for better conversation tracking
  transcript: string;
  normalizedTranscript: string; // Cleaned up transcript
  // Unified error handling
  errors: Record<string, AppError>;
  
  // Unified story state
  conversationComplete: boolean;
  isGenerating: boolean;
  storyContent: StorySection[];
  generatedStory: string | null;
  isGeneratingAudio: boolean;
  story: StoryContent;
  storyGenerationProgress: string | null;
  automaticGenerationActive: boolean;
  
  // Timing state for minimum display time
  minDisplayStartTime: number | null;
  
  // Story management actions
  setStoryPages: (pages: StoryPage[]) => void;
  setCurrentPage: (index: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  updateStoryElements: (elements: StoryElements) => void;
  saveStory: (title?: string) => Promise<void>;
  loadStory: (id: string) => Promise<void>;
  loadSavedStories: () => Promise<void>;
  
  // Enhanced conversation actions
  startConversation: () => void;
  addUserResponse: (response: string) => void;
  addAgentResponse: (response: string) => void; // New method for agent responses
  addDialogueTurn: (role: 'user' | 'agent', content: string) => void; // New structured dialogue method
  setPhase: (phase: ConversationPhase) => void;
  setSpeechState: (speechState: Partial<SpeechState>) => void;
  resetConversation: () => void;
  addError: (key: string, error: AppError) => void;
  removeError: (key: string) => void;
  clearErrors: () => void;
  hasError: (key?: string) => boolean;
  getError: (key: string) => AppError | undefined;
  endConversation: () => void;
  processTranscript: () => void; // New method to normalize transcript
  
  // Story generation actions
  generateStoryPromptAudio: (prompt: string) => Promise<AudioGenerationResult | null>;
  generateStoryAudio: (storyText: string) => Promise<AudioGenerationResult | null>;
  
  // Automatic story generation actions
  generateStoryAutomatically: () => Promise<void>;
  retryStoryGeneration: () => Promise<void>;
}

const useConversationStore = create<ConversationState>()(
  devtools(
    (set, get) => ({
      phase: 'INITIAL',
      conversationHistory: [],
      dialogue: [], // Initialize structured dialogue array
      transcript: '',
      normalizedTranscript: '', // Initialize normalized transcript
      errors: {},
      isListening: false,
      isSpeaking: false,
      speechRate: 1.0,
      speechVolume: 1.0,
      currentPageIndex: 0,
      storyPages: [],
      storyElements: {},
      savedStories: [],
      
      // Unified story state
      conversationComplete: false,
      isGenerating: false,
      storyContent: [],
      generatedStory: null,
      isGeneratingAudio: false,
      story: {
        content: null,
        sections: [],
      },
      
      // Initialize automatic generation state
      storyGenerationProgress: null,
      automaticGenerationActive: false,
      
      // Initialize timing state
      minDisplayStartTime: null,
      
      // Actions are simplified to avoid nested updates
      startConversation: () => {
        set({
          phase: 'CONVERSATION_ACTIVE',
          conversationHistory: [{
            role: 'system',
            content: 'You are a friendly children\'s story creator assistant.',
            timestamp: Date.now()
          }],
          dialogue: [], // Reset structured dialogue
          errors: {},
          isListening: false,
          isSpeaking: false,
          conversationComplete: false,
          transcript: '',
          normalizedTranscript: ''
        });
      },

      addUserResponse: (response: string) => {
        const { conversationHistory, dialogue, phase } = get();
        const timestamp = Date.now();
        
        // Only add response if we're in the right phase
        if (phase !== 'CONVERSATION_ACTIVE') {
          logger.warn(LogCategory.CONVERSATION, 'Attempted to add user response in invalid phase', { phase, response });
          return;
        }

        set({
          conversationHistory: [
            ...conversationHistory,
            {
              role: 'user',
              content: response,
              timestamp
            }
          ],
          dialogue: [
            ...dialogue,
            {
              role: 'user',
              content: response,
              timestamp
            }
          ]
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
          dialogue: [], // Reset dialogue
          transcript: '',
          normalizedTranscript: '', // Reset normalized transcript
          errors: {},
          isListening: false,
          isSpeaking: false,
          conversationComplete: false,
          isGenerating: false,
          storyContent: [],
          generatedStory: null,
          isGeneratingAudio: false,
          story: {
            content: null,
            sections: [],
          },
          // Reset automatic generation state
          storyGenerationProgress: null,
          automaticGenerationActive: false,
          minDisplayStartTime: null,
        });
      },

      // New standardized error handling methods
      addError: (key: string, error: AppError) => {
        set((state) => ({
          errors: { ...state.errors, [key]: error }
        }));
        ErrorHandler.handleError(error);
      },

      removeError: (key: string) => {
        set((state) => {
          const newErrors = { ...state.errors };
          delete newErrors[key];
          return { errors: newErrors };
        });
      },

      clearErrors: () => {
        set({ errors: {} });
      },

      hasError: (key?: string) => {
        const { errors } = get();
        return key ? key in errors : Object.keys(errors).length > 0;
      },

      getError: (key: string) => {
        const { errors } = get();
        return errors[key];
      },

      // New enhanced conversation methods
      addAgentResponse: (response: string) => {
        const { conversationHistory, dialogue } = get();
        const timestamp = Date.now();
        
        set({
          conversationHistory: [
            ...conversationHistory,
            {
              role: 'agent',
              content: response,
              timestamp
            }
          ],
          dialogue: [
            ...dialogue,
            {
              role: 'agent',
              content: response,
              timestamp
            }
          ]
        });
      },

      addDialogueTurn: (role: 'user' | 'agent', content: string) => {
        const { dialogue } = get();
        const timestamp = Date.now();
        
        set({
          dialogue: [
            ...dialogue,
            {
              role,
              content,
              timestamp
            }
          ]
        });
      },

      endConversation: () => {
        set({
          phase: 'CONVERSATION_ENDED',
          isListening: false,
          isSpeaking: false
        });
        
        // Process the transcript after ending
        get().processTranscript();
      },

      processTranscript: () => {
        const { dialogue } = get();
        
        set({ phase: 'TRANSCRIPT_PROCESSING' });
        
        // Generate normalized transcript using the utility
        const normalizedTranscript = TranscriptNormalizer.extractUserContent(dialogue);
        const fullTranscript = TranscriptNormalizer.generateTranscript(dialogue);
        
        set({
          transcript: fullTranscript,
          normalizedTranscript,
          conversationComplete: true,
          phase: 'STORY_GENERATING',
          automaticGenerationActive: true,
          minDisplayStartTime: Date.now() // Track when story generation begins
        });
        
        // Clear any existing story generation errors
        get().removeError('story_generation');
        
        // Auto-trigger the new automatic story generation
        setTimeout(() => {
          get().generateStoryAutomatically();
        }, 500);
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
          const appError = ErrorHandler.fromUnknown(
            error, 
            ErrorType.STORAGE, 
            ErrorSeverity.MEDIUM,
            { action: 'save_story', storyId: newStory.id }
          );
          get().addError('storage_save', appError);
          throw appError;
        }
      },

      loadStory: async (id: string) => {
        const { savedStories } = get();
        const story = savedStories.find(s => s.id === id);
        
        if (!story) {
          const appError = ErrorHandler.createError(
            ErrorType.VALIDATION,
            ErrorSeverity.LOW,
            `Story with id ${id} not found`,
            'The requested story could not be found.',
            undefined,
            { storyId: id }
          );
          get().addError('story_load', appError);
          throw appError;
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
          const appError = ErrorHandler.fromUnknown(
            error,
            ErrorType.STORAGE,
            ErrorSeverity.LOW,
            { action: 'load_saved_stories' }
          );
          get().addError('storage_load', appError);
          throw appError;
        }
      },
      
      // Audio generation actions

      generateStoryPromptAudio: async (prompt: string): Promise<AudioGenerationResult | null> => {
        set({ isGeneratingAudio: true });
        get().removeError('audio_generation');

        try {
          const audioResult = await ElevenLabsService.generateStoryPromptSpeech(prompt);
          audioLogger.complete('story prompt', { promptLength: prompt.length });
          return audioResult;
        } catch (error) {
          const appError = ErrorHandler.fromUnknown(
            error,
            ErrorType.AUDIO,
            ErrorSeverity.LOW,
            { action: 'generate_story_prompt_audio', prompt: prompt.substring(0, 50) }
          );
          get().addError('audio_generation', appError);
          return null;
        } finally {
          set({ isGeneratingAudio: false });
        }
      },

      generateStoryAudio: async (storyText: string): Promise<AudioGenerationResult | null> => {
        set({ isGeneratingAudio: true });
        get().removeError('audio_generation');

        try {
          const audioResult = await ElevenLabsService.generateSpeech(storyText);
          audioLogger.complete('story', { storyLength: storyText.length });
          return audioResult;
        } catch (error) {
          const appError = ErrorHandler.fromUnknown(
            error,
            ErrorType.AUDIO,
            ErrorSeverity.LOW,
            { action: 'generate_story_audio', storyLength: storyText.length }
          );
          get().addError('audio_generation', appError);
          return null;
        } finally {
          set({ isGeneratingAudio: false });
        }
      },

      // New automatic story generation methods
      generateStoryAutomatically: async () => {
        const { transcript, minDisplayStartTime } = get();
        
        if (!transcript?.trim()) {
          const appError = ErrorHandler.createError(
            ErrorType.VALIDATION,
            ErrorSeverity.MEDIUM,
            'No conversation transcript available for story generation',
            'We need a conversation transcript to create your story. Please try talking with the StoryWriter Agent first.',
            undefined,
            { action: 'automatic_story_generation' }
          );
          get().addError('story_generation', appError);
          set({
            automaticGenerationActive: false,
            phase: 'INITIAL',
            minDisplayStartTime: null
          });
          return;
        }

        set({
          isGenerating: true,
          storyGenerationProgress: 'Creating your story...'
        });
        
        // Clear any existing story generation errors
        get().removeError('story_generation');

        try {
          const result = await StoryGenerationService.generateStoryAutomatically(
            transcript,
            { maxRetries: 3, temperature: 0.7 },
            (progress) => {
              set({ storyGenerationProgress: progress });
            }
          );

          if (result.success && result.story) {
            // Validate the story content
            if (!result.story.pages || result.story.pages.length === 0) {
              const validationError = ErrorHandler.createError(
                ErrorType.STORY_GENERATION,
                ErrorSeverity.MEDIUM,
                'Generated story has no pages',
                'The story generator didn\'t create any content. Let\'s try again!',
                undefined,
                { pagesCount: 0 }
              );
              throw validationError;
            }
            
            const hasValidContent = result.story.pages.some(page => 
              page.content && page.content.trim().length > 0
            );
            
            if (!hasValidContent) {
              const validationError = ErrorHandler.createError(
                ErrorType.STORY_GENERATION,
                ErrorSeverity.MEDIUM,
                'Generated story pages contain no valid content',
                'The story pages seem to be empty. Let\'s try generating again!',
                undefined,
                { pagesCount: result.story.pages.length }
              );
              throw validationError;
            }

            // Convert to the format expected by the UI
            const storyContent = result.story.pages.map(page => ({
              text: page.content,
              imageUrl: null // We'll need to integrate image generation later
            }));

            // Check minimum display time requirement (3 seconds minimum)
            const elapsedTime = minDisplayStartTime ? Date.now() - minDisplayStartTime : 0;
            const minDisplayTime = 3000; // 3 seconds
            const remainingTime = Math.max(0, minDisplayTime - elapsedTime);

            // Handle phase transition with proper timing
            const completeStoryGeneration = () => {
              set({
                story: {
                  content: result.story.pages.map(p => p.content).join('\n\n'),
                  sections: storyContent
                },
                storyContent,
                generatedStory: result.story.pages.map(p => p.content).join('\n\n'),
                phase: 'STORY_COMPLETE',
                automaticGenerationActive: false,
                storyGenerationProgress: null,
                isGenerating: false,
                minDisplayStartTime: null
              });
            };

            if (remainingTime > 0) {
              // Wait for minimum display time
              setTimeout(completeStoryGeneration, remainingTime);
            } else {
              // Minimum time already elapsed, complete immediately
              completeStoryGeneration();
            }
          } else {
            const serviceError = ErrorHandler.createError(
              ErrorType.STORY_GENERATION,
              ErrorSeverity.MEDIUM,
              result.error || 'Story generation service failed',
              'Something went wrong with story generation. Let\'s try again! ✨',
              undefined,
              { serviceResult: result }
            );
            throw serviceError;
          }
        } catch (error) {
          let appError: AppError;
          if (error && typeof error === 'object' && 'type' in error && 'severity' in error) {
            appError = error as AppError;
          } else {
            appError = ErrorHandler.fromUnknown(
              error,
              ErrorType.STORY_GENERATION,
              ErrorSeverity.MEDIUM,
              { action: 'automatic_story_generation', transcript: transcript.substring(0, 100) }
            );
          }
          
          get().addError('story_generation', appError);
          set({
            automaticGenerationActive: false,
            storyGenerationProgress: null,
            isGenerating: false,
            minDisplayStartTime: null
          });
        }
      },

      retryStoryGeneration: async () => {
        get().removeError('story_generation');
        await get().generateStoryAutomatically();
      }
    })
  )
);

export { useConversationStore };