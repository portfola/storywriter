import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

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

// Define what information we need to track about speech
interface SpeechState {
  isListening: boolean;
  isSpeaking: boolean;
  speechRate: number;
  speechVolume: number;
}

// Define our store's state shape
interface ConversationState extends SpeechState {
  phase: ConversationPhase;
  conversationHistory: ConversationTurn[];
  currentQuestion: string;
  error: string | null;
  
  // Actions (these will be implemented as functions)
  startConversation: () => void;
  addUserResponse: (response: string) => void;
  setQuestion: (question: string) => void;
  setPhase: (phase: ConversationPhase) => void;
  setSpeechState: (speechState: Partial<SpeechState>) => void;
  resetConversation: () => void;
  setError: (error: string | null) => void;
}

// Create the store with initial state and actions
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

      // Actions
      startConversation: () => {
        set({
          phase: 'INTERVIEWING',
          conversationHistory: [{
            role: 'system',
            content: 'You are a friendly children\'s story creator assistant.',
            timestamp: Date.now()
          }],
          currentQuestion: 'What kind of story would you like to create today?',
          error: null
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
      }
    })
  )
);

// Create custom hooks for specific parts of the state
export const useConversationPhase = () => 
  useConversationStore((state) => state.phase);

export const useCurrentQuestion = () => 
  useConversationStore((state) => state.currentQuestion);

export const useConversationHistory = () => 
  useConversationStore((state) => state.conversationHistory);

export const useSpeechState = () => 
  useConversationStore((state) => ({
    isListening: state.isListening,
    isSpeaking: state.isSpeaking,
    speechRate: state.speechRate,
    speechVolume: state.speechVolume
  }));

export default useConversationStore;