import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Speech from 'expo-speech'; // For text-to-speech (TTS)
import Voice, { SpeechResultsEvent } from '@react-native-voice/voice'; // For voice-to-text
import { router } from 'expo-router'; // For navigation
import HuggingFaceService from '@/services/huggingFaceService'; // Service for AI responses
import StoryDisplay from '@/components/StoryDisplay'; // Component to display the generated story
import VoiceWave from '@/components/VoiceWave'; // Visual feedback for voice input/output
import useConversationStore from '@/src/stores/conversationStore'; // Global state management

/**
 * StoryScreen: The main screen for the storytelling process.
 * It handles the user's interaction via voice, processes their input,
 * and generates a story using AI.
 */
export default function StoryScreen() {
  // Extract states from the conversation store
  const phase = useConversationStore(state => state.phase); // Current app phase
  const currentQuestion = useConversationStore(state => state.currentQuestion); // Current question asked by AI
  const conversationHistory = useConversationStore(state => state.conversationHistory); // Full conversation log
  const isListening = useConversationStore(state => state.isListening); // Whether the app is recording voice
  const isSpeaking = useConversationStore(state => state.isSpeaking); // Whether the app is speaking (TTS)
  const speechRate = useConversationStore(state => state.speechRate); // Speed of TTS output
  const speechVolume = useConversationStore(state => state.speechVolume); // Volume of TTS output
  const currentPageIndex = useConversationStore(state => state.currentPageIndex); // Current story page index
  const storyPages = useConversationStore(state => state.storyPages); // List of story pages

  // Extract actions from the conversation store
  const startConversation = useConversationStore(state => state.startConversation); // Begin a new conversation
  const addUserResponse = useConversationStore(state => state.addUserResponse); // Add a user's input to the conversation
  const setQuestion = useConversationStore(state => state.setQuestion); // Set the next question
  const setSpeechState = useConversationStore(state => state.setSpeechState); // Update TTS/voice state
  const setPhase = useConversationStore(state => state.setPhase); // Change the app's current phase
  const setError = useConversationStore(state => state.setError); // Set an error message
  const setStoryPages = useConversationStore(state => state.setStoryPages); // Update story pages
  const resetConversation = useConversationStore(state => state.resetConversation); // Reset the conversation

  useEffect(() => {
    const initialize = async () => {
      if (phase === 'INITIAL') {
        await startConversation();
        setPhase('INTERVIEWING'); // Ensure phase changes before listening
      }
    };
    initialize();
  }, [phase, startConversation]);
  
  /**
   * Starts listening immediately after a question is asked.
   * Ensures the app correctly listens for speech input.
   */
  useEffect(() => {
    const initVoice = async () => {
      try {
        // Set up voice recognition event handlers
        Voice.onSpeechStart = () => setSpeechState({ isListening: true });
        Voice.onSpeechEnd = () => setSpeechState({ isListening: false });
        Voice.onSpeechError = (error) => {
          console.error('Speech error:', error);
          setSpeechState({ isListening: false });
          setError(`Speech recognition error: ${error}`);
        };
        Voice.onSpeechResults = handleSpeechResults;
  
        // Speak first, then start listening
        if (currentQuestion) {
          await speak(currentQuestion);
          await Voice.start('en-US'); // Start listening **immediately after speaking**
        }
      } catch (error) {
        console.error('Error initializing voice:', error);
        setError('Failed to initialize voice recognition');
      }
    };
  
    if (phase === 'INTERVIEWING') {
      initVoice();
    }
  
    return () => {
      const cleanup = async () => {
        try {
          await Voice.destroy();
          await Speech.stop();
          Voice.removeAllListeners();
        } catch (error) {
          console.error('Error during cleanup:', error);
        }
      };
      cleanup();
    };
  }, [phase, currentQuestion, setSpeechState, setError]);
  
  /**
   * Handles speech recognition results and determines the next step.
   */
  const handleSpeechResults = (e: SpeechResultsEvent) => {
    if (e.value && e.value.length > 0) {
      const text = e.value[0]; // Take the first recognized result
      if (text) {
        handleAnswer(text); // Handle user's response
      }
    }
  };
  
  /**
   * Speaks a given text aloud using TTS.
   * Starts listening immediately after speaking.
   */
  const speak = async (text: string) => {
    try {
      if (isSpeaking) {
        await Speech.stop(); // Stop any ongoing speech
      }
      setSpeechState({ isSpeaking: true }); // Indicate speaking has started
  
      await Speech.speak(text, {
        rate: speechRate,
        volume: speechVolume,
        onDone: async () => {
          setSpeechState({ isSpeaking: false });
          await Voice.start('en-US'); // Start listening once speaking is finished
        },
        onError: () => {
          setSpeechState({ isSpeaking: false });
          setError('Failed to speak');
        },
      });
    } catch (error) {
      console.error('Error in speak function:', error);
      setSpeechState({ isSpeaking: false });
      setError('Failed to speak');
    }
  };  
  

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.push('/')}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.contentContainer}>
        {phase === 'DISPLAYING_STORY' ? (
          <StoryDisplay storyPages={storyPages} currentPageIndex={currentPageIndex} />
        ) : (
          <>
            <Text style={styles.currentQuestion}>{currentQuestion}</Text>
            <VoiceWave isListening={isListening} isSpeaking={isSpeaking} />
            {phase === 'PROCESSING' && (
              <Text style={styles.processingText}>Processing your response...</Text>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f8ff' },
  backButton: { position: 'absolute', top: 20, left: 20, padding: 10, backgroundColor: '#3498db', borderRadius: 8 },
  backButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  contentContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  currentQuestion: { fontSize: 24, marginBottom: 30, textAlign: 'center' },
  processingText: { fontSize: 16, fontStyle: 'italic', color: '#666', marginTop: 10 },
});
