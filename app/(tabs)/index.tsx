import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import Voice, { SpeechResultsEvent } from '@react-native-voice/voice';
import { router } from 'expo-router';

import HuggingFaceService from '@/services/huggingFaceService';
import StoryDisplay from '@/components/StoryDisplay';
import SpeechControls from '@/components/SpeechControls';
import StoryManagement from '@/components/StoryManagement';
import VoiceWave from '@/components/VoiceWave';
import { StoryPage } from '@/src/utils/storyGenerator';

import useConversationStore, {
  useConversationPhase,
  useCurrentQuestion,
  useSpeechState
} from '@/src/stores/conversationStore';

interface ConversationTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface SavedStory {
  title: string;
  content: StoryPage[];
  elements: { [key: string]: string };
}

export default function TabOneScreen() {
  const phase = useConversationPhase();
  const currentQuestion = useCurrentQuestion();
  const speechState = useSpeechState();
  const {
    startConversation,
    addUserResponse,
    setQuestion,
    setSpeechState,
    resetConversation,
    setError
  } = useConversationStore();

  useEffect(() => {
    // Initialize voice recognition and start the interview process
    const initializeVoice = async () => {
      try {
        // Set up all voice event listeners
        Voice.onSpeechStart = () => setSpeechState({ isListening: true });
        Voice.onSpeechEnd = () => setSpeechState({ isListening: false });
        Voice.onSpeechError = (error) => {
          console.error('Speech error:', error);
          setSpeechState({ isListening: false });
          setError('Speech recognition error: ${error.message}');
        };
        Voice.onSpeechResults = handleSpeechResults;
  
        // Start the conversation
        await startConversation();
        await speak(currentQuestion);
      } catch (error) {
        console.error('Error initializing voice:', error);
        setError('Failed to initialize voice recognition');
      }
    };
  
    initializeVoice();
  
    // Cleanup function
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
  }, []);
  
  useEffect(() => {
    const loadSavedStories = async () => {
      try {
        const saved = await AsyncStorage.getItem('savedStories');
        if (saved) {
          setSavedStories(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Failed to load saved stories', e);
      }
    };
    loadSavedStories();
  }, []);

  const handleSpeechResults = (e: SpeechResultsEvent) => {
    const text = e.value?.[0];
    if (text) {
      if (speechState.isSpeaking) {
        handleInterruption(text);
      } else {
        handleAnswer(text);
      }
    }
  };

  const generateNextQuestion = async () => {
    // Comprehensive state check before proceeding
    if (phase !== 'INTERVIEWING') {
      console.log('Not in interview mode, skipping question generation');
      return;
    }
  
    if (phase === 'PROCESSING' || speechState.isSpeaking) {
      console.log('Blocked question generation:', {
        phase,
        isSpeaking: speechState.isSpeaking
      });
      return;
    }
  
    // Check for valid conversation history
    const hasUserInput = conversationHistory.some(turn => turn.role === 'user');
    console.log('Conversation status:', { 
      hasUserInput, 
      historyLength: conversationHistory.length,
      history: conversationHistory 
    });
  
    // For the initial question, don't make an API call
    if (!hasUserInput) {
      console.log('No user input yet, waiting for first response');
      return;
    }
  
    try {
      setPhase('PROCESSING');
  
      const prompt = `Based on our conversation so far, ask the next question to gather more details for a children's story. 
      If you have enough information (after 3-5 questions) to create a story, respond with "INTERVIEW_COMPLETE" 
      followed by a summary of the story elements.
  
      Current conversation:
      ${conversationHistory.map(turn => `${turn.role}: ${turn.content}`).join('\n')}`;
  
      const response = await HuggingFaceService.generateResponse(prompt);
      
      if (response.includes('INTERVIEW_COMPLETE')) {
        console.log('Interview complete, transitioning to story generation');
        setIsInterviewing(false);
        const summary = response.split('INTERVIEW_COMPLETE')[1].trim();
        await generateAndDisplayStory(summary);
      } else {
        console.log('Preparing to ask next question:', response.slice(0, 50) + '...');
        const nextQuestion = response.trim();
        setCurrentQuestion(nextQuestion);
        
        // Make sure previous speech is stopped
        await stopCurrentSpeech();
        await speak(nextQuestion, true);
      }
    } catch (error) {
      console.error('Error generating question:', error);
      speak('I had trouble thinking of the next question. Should we try again?');
    } finally {
      setPhase('INTERVIEWING');
    }
  };

  const handleAnswer = async (answer: string) => {
    // First check if we're in the right phase to process an answer
    if (phase !== 'INTERVIEWING') {
      console.log('Not in interviewing phase, ignoring answer'); 
      return;
    }
    
    try {
      // Stop listening while we process the answer
      await stopListening();

      // Add the user's response to our conversation history
      addUserResponse(answer);

      // Set the processing phase while we generate the next question
      setPhase('PROCESSING');

      // Generate the next question using your Hugging Face service
      const prompt = `Based on our conversation so far, ask the next question to gather more details for a children's story. If you have enough information (after 3-5 questions) to create a story, respond with "INTERVIEW_COMPLETE" followed by a summary of the story elements. Current conversation: ${conversationHistory.map(turn => `${turn.role}: ${turn.content}`).join('\n')}`;

      const response = await HuggingFaceService.generateResponse(prompt);

      // Check if we have enough information to generate the story
      if (response.includes('INTERVIEW_COMPLETE')) {
        console.log('Interview complete, transitioning to story generation');
        setPhase('GENERATING_STORY');
        const summary = response.split('INTERVIEW_COMPLETE')[1].trim();
        await generateAndDisplayStory(summary);
      } else {
        // If we need more information, ask the next question
        console.log('Preparing to ask next question:', response.slice(0, 50) + '...');
        const nextQuestion = response.trim();

        // Make sure any previous speech is stopped
        await stopCurrentSpeech();

        // Set the new question in our store and speak it
        setQuestion(nextQuestion);
        await speak(nextQuestion);

        // Resume listening for the next answer
        if (phase === 'INTERVIEWING' && !speechState.isSpeaking) {
          await startListening();
        }
      }
    } catch (error) {
      console.error('Error handling answer:', error);
      setError('Failed to process your answer');

      // If something goes wrong, let's tell the user
      await speak('I had trouble processing your answer. Could you try again?');

      // Reset back to interviewing phase
      setPhase('INTERVIEWING');

      // Resume listening
      await startListening();
    }
  };
  
  const speak = async (text: string) => {
    try {
      if (speechState.isSpeaking) {
        await Speech.stop();
      }
  
      setSpeechState({ isSpeaking: true });
      
      await Speech.speak(text, {
        rate: speechState.speechRate,
        volume: speechState.speechVolume,
        onDone: () => setSpeechState({ isSpeaking: false }),
        onError: (error) => {
          console.error('Speech error:', error);
          setSpeechState({ isSpeaking: false });
          setError('Failed to speak');
        }
      });
    } catch (error) {
      console.error('Error in speak function:', error);
      setSpeechState({ isSpeaking: false });
      setError('Failed to speak');
    }
  };

  const stopCurrentSpeech = async () => {
    try {
      if (speechState.isSpeaking) {
        await Speech.stop();
        setSpeechState({ isSpeaking: false });
      }
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  };

  const handleInterruption = async (text: string) => {
    console.log("User interrupted with:", text);
    await stopCurrentSpeech();
    
    // If we're in story mode and user says something like "stop" or "pause" or "wait"
    if (text.toLowerCase().includes('stop') || text.toLowerCase().includes('pause') || text.toLowerCase().includes('wait')) {
      await stopCurrentSpeech();
    }
    
    // If user says "next" or "continue" while in story mode
    if (phase !== 'INTERVIEWING' && (text.toLowerCase().includes('next') || text.toLowerCase().includes('continue'))) {
      if (currentPageIndex < storyPages.length - 1) {
        setCurrentPageIndex(prev => prev + 1);
        speak(storyPages[currentPageIndex + 1].textContent);
      }
    }
  };

  const startListening = async () => {
    try {
      if (!speechState.isListening) {
        const isAvailable = await Voice.isAvailable();
        if (!isAvailable) {
          throw new Error('Voice recognition not available');
        }
        await Voice.start('en-US');
      }
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      setError('Failed to start voice recognition');
    }
  };

  const stopListening = async () => {
    try {
      if (speechState.isListening) {
        await Voice.stop();
      }
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
      setError('Failed to stop voice recognition');
    }
  };

  const generateAndDisplayStory = async (summary?: string) => {
    if (phase === 'PROCESSING') {
      console.log('Already processing, cannot generate story');
      return;
    }
  
    try {
      setPhase('PROCESSING');
      await stopCurrentSpeech(); // Stop any ongoing speech
  
      const prompt = `Create a children's story based on these elements:
      ${summary || Object.entries(storyElements).map(([q, a]) => `${q}: ${a}`).join('\n')}
      
      Format the story as 5 separate pages, with each page being a couple of paragraphs long.
      Each page should be suitable for illustration.
      Make the story engaging and appropriate for children.
      
      Return the story as a JSON array of 5 page objects.`;
  
      const response = await HuggingFaceService.generateResponse(prompt);
      let generatedPages;
      
      try {
        generatedPages = JSON.parse(response);
      } catch (e) {
        console.log('Failed to parse JSON response, falling back to text splitting');
        const text = response.split('.').filter(Boolean);
        const pageSize = Math.ceil(text.length / 5);
        generatedPages = Array(5).fill(null).map((_, i) => ({
          textContent: text.slice(i * pageSize, (i + 1) * pageSize).join('.') + '.'
        }));
      }
      
      setStoryPages(generatedPages);
      setCurrentPageIndex(0);
      
      // Only start speaking if we're still in a valid state
      if (phase !== 'PROCESSING' && !speechState.isSpeaking) {
        await speak(generatedPages[0].textContent);
      }
    } catch (error) {
      console.error('Error generating story:', error);
      await speak('I encountered an error while creating your story. Should we try again?');
    } finally {
      // Make sure we return to the interviewing phase
      setPhase('INTERVIEWING');
    }
  };

  const saveStory = async () => {
    const newStory: SavedStory = {
      title: `Story Created on ${new Date().toLocaleDateString()}`,
      content: storyPages,
      elements: storyElements
    };
    const updatedStories = [...savedStories, newStory];
    setSavedStories(updatedStories);
    try {
      await AsyncStorage.setItem('savedStories', JSON.stringify(updatedStories));
    } catch (e) {
      console.error('Failed to save the story', e);
    }
  };

  const loadStory = (index: number) => {
    const story = savedStories[index];
    if (story) {
      setStoryElements(story.elements);
      setStoryPages(story.content);
      setCurrentPageIndex(0);
      speak(story.content[0].textContent);
    }
  };

  const startNewStory = async () => {
    console.log('Starting new story:', { 
      phase, 
      isSpeaking: speechState.isSpeaking 
    });
    
    if (phase === 'PROCESSING' || speechState.isSpeaking) {
      console.log('Cannot start new story - already processing or speaking');
      return;
    }
    
    try {
      setPhase('PROCESSING');
      
      // Reset all state
      await stopCurrentSpeech();
      setIsInterviewing(true);
      setStoryElements({});
      setStoryPages([]);
      setCurrentPageIndex(0);
      
      // Initialize with ONLY the system message
      setConversationHistory([{
        role: 'system',
        content: 'You are a friendly children\'s story creator assistant.'
      }]);
  
      const initialQuestion = "What kind of story would you like to create today?";
      console.log('Setting initial question:', initialQuestion);
      setCurrentQuestion(initialQuestion);
      
      // Ensure we're not already listening
      if (isListening) {
        await stopListening();
      }
      
      // Wait for speech to complete before starting listening
      await speak(initialQuestion, true);
      
      // Small delay before starting to listen
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Starting listening');
      await startListening();
    } catch (error) {
      console.error('Error starting new story:', error);
      speak('I had trouble starting. Please try again.');
    } finally {
      setPhase('INTERVIEWING');
    }
  };

  const handleBack = async () => {
    try {
      await stopListening();
      await Speech.stop();
      resetConversation();
      router.push('/');
    } catch (error) {
      console.error('Error during navigation:', error);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBack}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.contentContainer}>
        <Text style={styles.currentQuestion}>{currentQuestion}</Text>
        <VoiceWave
          isListening={speechState.isListening}
          isSpeaking={speechState.isSpeaking}
        />
        {phase === 'PROCESSING' && (
          <Text style={styles.processingText}>Processing your response...</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    padding: 20,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 1,
    padding: 10,
    backgroundColor: '#3498db',
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  currentQuestion: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 30,
    color: '#2c3e50',
  },
  thinkingText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 10,
    fontStyle: 'italic',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    gap: 4,
  },
  bar: {
    width: 4,
    borderRadius: 2,
  }
});