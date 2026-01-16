import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StoryPage } from '@/types/story';
import ElevenLabsService from '@/services/elevenLabsService';
import StoryGenerationService from '@/services/storyGenerationService';
import { AudioGenerationResult } from '@/types/elevenlabs';
import { ErrorHandler, ErrorType, ErrorSeverity, AppError } from '@/src/utils/errorHandler';
import { logger, audioLogger, LogCategory } from '@/src/utils/logger';

// Simplified conversation phases - let ElevenLabs handle the complexity
export type ConversationPhase =
  | 'IDLE'              // No active conversation
  | 'ACTIVE'            // ElevenLabs conversation in progress
  | 'GENERATING'        // Generating story from final transcript
  | 'COMPLETE';         // Story ready

// Simplified story elements structure
export interface StoryElements {
  [key: string]: string;
}

// Story section structure
export interface StorySection {
  text: string;
  imageUrl: string | null;
}

// Story content structure
export interface StoryContent {
  content: string | null;
  sections: StorySection[];
}

// Saved story structure
export interface SavedStory {
  id: string;
  title: string;
  content: StoryPage[];
  elements: StoryElements;
  createdAt: number;
}

// Speech state for UI feedback
export interface SpeechState {
  isListening: boolean;
  isSpeaking: boolean;
  speechRate: number;
  speechVolume: number;
}

// Story state
export interface StoryState {
  currentPageIndex: number;
  storyPages: StoryPage[];
  storyElements: StoryElements;
  savedStories: SavedStory[];
  resetConversation: () => void;
}

// Simplified conversation state - trust ElevenLabs to handle conversation flow
export interface ConversationState extends SpeechState, StoryState {
  phase: ConversationPhase;

  // Simple transcript capture when conversation ends
  finalTranscript: string;

  // Unified error handling
  errors: Record<string, AppError>;

  // Story generation state
  isGenerating: boolean;
  storyContent: StorySection[];
  generatedStory: string | null;
  isGeneratingAudio: boolean;
  story: StoryContent;
  storyGenerationProgress: string | null;

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

  // Simplified conversation actions
  startConversation: () => void;
  endConversation: (transcript: string) => void; // Accept final transcript from ElevenLabs
  setPhase: (phase: ConversationPhase) => void;
  setSpeechState: (speechState: Partial<SpeechState>) => void;
  resetConversation: () => void;

  // Error handling
  addError: (key: string, error: AppError) => void;
  removeError: (key: string) => void;
  clearErrors: () => void;
  hasError: (key?: string) => boolean;
  getError: (key: string) => AppError | undefined;

  // Audio generation
  generateStoryPromptAudio: (prompt: string) => Promise<AudioGenerationResult | null>;
  generateStoryAudio: (storyText: string) => Promise<AudioGenerationResult | null>;

  // Story generation
  generateStoryAutomatically: () => Promise<void>;
  retryStoryGeneration: () => Promise<void>;
}

const useConversationStore = create<ConversationState>()(
  devtools(
    (set, get) => ({
      phase: 'IDLE',
      finalTranscript: '',
      errors: {},
      isListening: false,
      isSpeaking: false,
      speechRate: 1.0,
      speechVolume: 1.0,
      currentPageIndex: 0,
      storyPages: [],
      storyElements: {},
      savedStories: [],

      // Story state
      isGenerating: false,
      storyContent: [],
      generatedStory: null,
      isGeneratingAudio: false,
      story: {
        content: null,
        sections: [],
      },
      storyGenerationProgress: null,
      minDisplayStartTime: null,

      // Simplified conversation actions
      startConversation: () => {
        logger.info(LogCategory.CONVERSATION, 'Starting conversation - trusting ElevenLabs to handle dialogue', {});
        set({
          phase: 'ACTIVE',
          finalTranscript: '',
          errors: {},
          isListening: false,
          isSpeaking: false
        });
      },

      endConversation: (transcript: string) => {
        logger.info(LogCategory.CONVERSATION, 'Conversation ended with transcript from ElevenLabs', {
          transcriptLength: transcript.length,
          transcriptPreview: transcript.substring(0, 100)
        });

        set({
          phase: 'GENERATING',
          finalTranscript: transcript,
          isListening: false,
          isSpeaking: false,
          minDisplayStartTime: Date.now()
        });

        // Clear any existing story generation errors
        get().removeError('story_generation');

        // Auto-trigger story generation
        setTimeout(() => {
          void get().generateStoryAutomatically();
        }, 500);
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
          phase: 'IDLE',
          finalTranscript: '',
          errors: {},
          isListening: false,
          isSpeaking: false,
          isGenerating: false,
          storyContent: [],
          generatedStory: null,
          isGeneratingAudio: false,
          story: {
            content: null,
            sections: [],
          },
          storyGenerationProgress: null,
          minDisplayStartTime: null,
        });
      },

      // Error handling methods
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

      // Story management actions (unchanged)
      setStoryPages: (pages: StoryPage[]) => {
        set({
          storyPages: pages,
          currentPageIndex: 0,
          phase: 'COMPLETE'
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
          phase: 'COMPLETE'
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

      // ------------------------------------------------------------------
      // UPDATED: Simplified story generation (Fixed for New Service)
      // ------------------------------------------------------------------
      generateStoryAutomatically: async () => {
        const { finalTranscript, minDisplayStartTime } = get();

        // 1. Validation
        if (!finalTranscript || finalTranscript.trim().length === 0) {
          const appError = ErrorHandler.createError(
            ErrorType.VALIDATION,
            ErrorSeverity.MEDIUM,
            'No conversation transcript available',
            'We need a conversation transcript to create your story.',
            undefined,
            { action: 'automatic_story_generation' }
          );
          get().addError('story_generation', appError);
          set({ phase: 'IDLE', minDisplayStartTime: null });
          return;
        }

        // 2. Set Loading State
        set({
          isGenerating: true,
          storyGenerationProgress: 'Creating your story...'
        });

        get().removeError('story_generation');

        try {
          logger.info(LogCategory.CONVERSATION, 'Starting story generation', {
            transcriptLength: finalTranscript.length
          });

          // --- THE BIG CHANGE: CALL THE NEW SERVICE METHOD ---
          // No more options object, just the transcript
          const result = await StoryGenerationService.generateStory(finalTranscript);

          if (result.success && result.story) {

            // Check for valid content
            const hasValidContent = result.story.pages && result.story.pages.length > 0;

            if (!hasValidContent) {
              throw ErrorHandler.createError(
                ErrorType.STORY_GENERATION,
                ErrorSeverity.MEDIUM,
                'Generated story has no pages',
                'The story generator returned empty content.'
              );
            }

            // Map to Store Structure
            const storyContent = result.story.pages.map(page => ({
              text: page.content,
              imageUrl: page.imageUrl ?? null
            }));

            // 3. Handle Minimum Display Time (UX Pacing)
            const elapsedTime = minDisplayStartTime ? Date.now() - minDisplayStartTime : 0;
            const minDisplayTime = 3000;
            const remainingTime = Math.max(0, minDisplayTime - elapsedTime);

            const completeStoryGeneration = () => {
              set({
                story: {
                  content: result.story.pages.map(p => p.content).join('\n\n'),
                  sections: storyContent
                },
                storyContent,
                generatedStory: result.story.pages.map(p => p.content).join('\n\n'),
                phase: 'COMPLETE',
                storyGenerationProgress: null,
                isGenerating: false,
                minDisplayStartTime: null
              });
            };

            if (remainingTime > 0) {
              setTimeout(completeStoryGeneration, remainingTime);
            } else {
              completeStoryGeneration();
            }

          } else {
            throw ErrorHandler.createError(
              ErrorType.STORY_GENERATION,
              ErrorSeverity.MEDIUM,
              result.error || 'Story generation failed',
              'Something went wrong. Let\'s try again!'
            );
          }
        } catch (error) {
          const appError = ErrorHandler.fromUnknown(error, ErrorType.STORY_GENERATION, ErrorSeverity.MEDIUM);

          get().addError('story_generation', appError);
          set({
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