import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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

  /**
   * Initialize the conversation when the app first loads.
   * Starts in the 'INITIAL' phase and transitions to asking the first question.
   */
  useEffect(() => {
    const initialize = async () => {
      if (phase === 'INITIAL') {
        await startConversation();
      }
    };
    initialize();
  }, [phase, startConversation]);

  /**
   * Handle results from voice recognition.
   * Processes the text captured by the microphone.
   */
  const handleSpeechResults = (e: SpeechResultsEvent) => {
    if (e.value && e.value.length > 0) {
      const text = e.value[0]; // Take the first recognized result
      if (text) {
        if (isSpeaking) {
          handleInterruption(text); // Handle interruptions during speech output
        } else {
          handleAnswer(text); // Handle user's response
        }
      }
    }
  };

  /**
   * Speak a given text aloud using TTS.
   * Updates the speaking state to prevent conflicts during output.
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
        onDone: () => setSpeechState({ isSpeaking: false }),
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

  /**
   * Initialize voice recognition and prepare listeners.
   * Cleans up resources when the component unmounts.
   */
  useEffect(() => {
    if (phase !== 'INITIAL') {
      const initVoice = async () => {
        try {
          // Set up voice recognition event handlers
          Voice.onSpeechStart = () => setSpeechState({ isListening: true });
          Voice.onSpeechEnd = () => setSpeechState({ isListening: false });
          Voice.onSpeechError = (error) => {
            console.error('Speech error:', error);
            setSpeechState({ isListening: false });
            setError(`Speech recognition error: ${error.message}`);
          };
          Voice.onSpeechResults = handleSpeechResults;

          // Speak the current question aloud
          if (currentQuestion) {
            await speak(currentQuestion);
          }
        } catch (error) {
          console.error('Error initializing voice:', error);
          setError('Failed to initialize voice recognition');
        }
      };
      initVoice();
    }

    // Cleanup function to release resources
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
   * Generate the next question or story segment.
   * Uses AI to analyze the current conversation and decide the next step.
   */
  const generateNextQuestion = async () => {
    if (phase !== 'INTERVIEWING' || isSpeaking) {
      console.log('Blocked question generation due to current state.');
      return;
    }
    try {
      setPhase('PROCESSING'); // Transition to processing phase

      // Build a prompt for the AI
      const prompt = `Based on our conversation so far, ask the next question...`;
      const response = await HuggingFaceService.generateResponse(prompt);

      if (response.includes('INTERVIEW_COMPLETE')) {
        const summary = response.split('INTERVIEW_COMPLETE')[1].trim();
        await generateAndDisplayStory(summary); // Transition to story generation
      } else {
        setQuestion(response.trim());
        await speak(response.trim());
      }
    } catch (error) {
      console.error('Error generating question:', error);
      setError('Failed to generate question.');
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
