// story.tsx
import React, { useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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

import useConversationStore from '@/src/stores/conversationStore';

export default function StoryScreen() {
  // Individual state selectors
  const phase = useConversationStore(state => state.phase);
  const currentQuestion = useConversationStore(state => state.currentQuestion);
  const conversationHistory = useConversationStore(state => state.conversationHistory);
  
  // Speech state
  const isListening = useConversationStore(state => state.isListening);
  const isSpeaking = useConversationStore(state => state.isSpeaking);
  const speechRate = useConversationStore(state => state.speechRate);
  const speechVolume = useConversationStore(state => state.speechVolume);

  // Story state
  const currentPageIndex = useConversationStore(state => state.currentPageIndex);
  const storyPages = useConversationStore(state => state.storyPages);
  const storyElements = useConversationStore(state => state.storyElements);
  
  // Actions
  const actions = useConversationStore(
    React.useCallback(
    (state) => ({
        startConversation: state.startConversation,
        addUserResponse: state.addUserResponse,
        setQuestion: state.setQuestion,
        setSpeechState: state.setSpeechState,
        resetConversation: state.resetConversation,
        setError: state.setError,
        setPhase: state.setPhase,
        setStoryPages: state.setStoryPages,
        setCurrentPage: state.setCurrentPage,
        nextPage: state.nextPage,
        previousPage: state.previousPage,
        updateStoryElements: state.updateStoryElements,
        saveStory: state.saveStory,
        loadStory: state.loadStory,
        loadSavedStories: state.loadSavedStories
      }),
      []
    )
  );

  // Initialize conversation
  useEffect(() => {
    const initialize = async () => {
      if (phase === 'INITIAL') {
        await actions.startConversation();
      }
    };
    
    initialize();
  }, [phase, actions.startConversation]);

  // Initialize voice
  useEffect(() => {
    if (phase !== 'INITIAL') {
      const initVoice = async () => {
        try {
          Voice.onSpeechStart = () => actions.setSpeechState({ isListening: true });
          Voice.onSpeechEnd = () => actions.setSpeechState({ isListening: false });
          Voice.onSpeechError = (error) => {
            console.error('Speech error:', error);
            actions.setSpeechState({ isListening: false });
            actions.setError('Speech recognition error: ${error.message}');
          };
          Voice.onSpeechResults = handleSpeechResults;
          
          if (currentQuestion) {
            await speak(currentQuestion);
          }
        } catch (error) {
          console.error('Error initializing voice:', error);
          actions.setError('Failed to initialize voice recognition');
        }
      };
      
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
  }, [phase, currentQuestion, actions.setSpeechState, actions.setError]);

  // Load saved stories
  useEffect(() => {
    actions.loadSavedStories().catch(error => {
      console.error('Failed to load saved stories', error);
      actions.setError('Failed to load saved stories');
    });
  }, []);

  const handleSpeechResults = (e: SpeechResultsEvent) => {
    const text = e.value?.[0];
    if (text) {
      if (isSpeaking) {
        handleInterruption(text);
      } else {
        handleAnswer(text);
      }
    }
  };

  const speak = async (text: string) => {
    try {
      if (isSpeaking) {
        await Speech.stop();
      }
  
      actions.setSpeechState({ isSpeaking: true });
      
      await Speech.speak(text, {
        rate: speechRate,
        volume: speechVolume,
        onDone: () => actions.setSpeechState({ isSpeaking: false }),
        onError: (error) => {
          console.error('Speech error:', error);
          actions.setSpeechState({ isSpeaking: false });
          actions.setError('Failed to speak');
        }
      });
    } catch (error) {
      console.error('Error in speak function:', error);
      actions.setSpeechState({ isSpeaking: false });
      actions.setError('Failed to speak');
    }
  };

  const generateNextQuestion = async () => {
    if (phase !== 'INTERVIEWING') {
      console.log('Not in interview mode, skipping question generation');
      return;
    }
  
    if (phase === 'INTERVIEWING' || isSpeaking) {
      console.log('Blocked question generation:', { phase, isSpeaking });
      return;
    }
  
    const hasUserInput = conversationHistory.some(turn => turn.role === 'user');
    console.log('Conversation status:', { 
      hasUserInput, 
      historyLength: conversationHistory.length,
      history: conversationHistory 
    });
  
    if (!hasUserInput) {
      console.log('No user input yet, waiting for first response');
      return;
    }
  
    try {
      actions.setPhase('PROCESSING');
  
      const prompt = `Based on our conversation so far, ask the next question to gather more details for a children's story. 
      If you have enough information (after 3-5 questions) to create a story, respond with "INTERVIEW_COMPLETE" 
      followed by a summary of the story elements.
  
      Current conversation:
      ${conversationHistory.map(turn => `${turn.role}: ${turn.content}`).join('\n')}`;
  
      const response = await HuggingFaceService.generateResponse(prompt);
      
      if (response.includes('INTERVIEW_COMPLETE')) {
        console.log('Interview complete, transitioning to story generation');
        const summary = response.split('INTERVIEW_COMPLETE')[1].trim();
        await generateAndDisplayStory(summary);
      } else {
        console.log('Preparing to ask next question:', response.slice(0, 50) + '...');
        const nextQuestion = response.trim();
        
        await stopCurrentSpeech();
        actions.setQuestion(nextQuestion);
        await speak(nextQuestion);
      }
    } catch (error) {
      console.error('Error generating question:', error);
      await speak('I had trouble thinking of the next question. Should we try again?');
      actions.setError('Failed to generate next question');
    }
  };
  
  const handleAnswer = async (answer: string) => {
    if (phase !== 'INTERVIEWING') {
      console.log('Not in interviewing phase, ignoring answer'); 
      return;
    }
    
    try {
      await stopListening();
      actions.addUserResponse(answer);
      actions.setPhase('PROCESSING');
  
      const prompt = `Based on our conversation so far, ask the next question to gather more details for a children's story. 
      If you have enough information (after 3-5 questions) to create a story, respond with "INTERVIEW_COMPLETE" 
      followed by a summary of the story elements. 
      
      Current conversation: ${conversationHistory.map(turn => `${turn.role}: ${turn.content}`).join('\n')}`;
  
      const response = await HuggingFaceService.generateResponse(prompt);
  
      if (response.includes('INTERVIEW_COMPLETE')) {
        console.log('Interview complete, transitioning to story generation');
        actions.setPhase('GENERATING_STORY');
        const summary = response.split('INTERVIEW_COMPLETE')[1].trim();
        await generateAndDisplayStory(summary);
      } else {
        console.log('Preparing to ask next question:', response.slice(0, 50) + '...');
        const nextQuestion = response.trim();
  
        await stopCurrentSpeech();
        actions.setQuestion(nextQuestion);
        await speak(nextQuestion);
  
        if (phase === 'INTERVIEWING' && !isSpeaking) {
          await startListening();
        }
      }
    } catch (error) {
      console.error('Error handling answer:', error);
      actions.setError('Failed to process your answer');
      await speak('I had trouble processing your answer. Could you try again?');
      actions.setPhase('INTERVIEWING');
      await startListening();
    }
  };
  
  const stopCurrentSpeech = async () => {
    try {
      if (isSpeaking) {
        await Speech.stop();
        actions.setSpeechState({ isSpeaking: false });
      }
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  };
  
  const handleInterruption = async (text: string) => {
    console.log("User interrupted with:", text);
    await stopCurrentSpeech();
    
    if (text.toLowerCase().includes('stop') || text.toLowerCase().includes('pause') || text.toLowerCase().includes('wait')) {
      await stopCurrentSpeech();
    }
    
    if (phase === 'DISPLAYING_STORY' && (text.toLowerCase().includes('next') || text.toLowerCase().includes('continue'))) {
      if (currentPageIndex < storyPages.length - 1) {
        actions.nextPage();
        await speak(storyPages[currentPageIndex + 1].textContent);
      }
    }
  };
  
  const startListening = async () => {
    try {
      if (!isListening) {
        const isAvailable = await Voice.isAvailable();
        if (!isAvailable) {
          throw new Error('Voice recognition not available');
        }
        await Voice.start('en-US');
      }
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      actions.setError('Failed to start voice recognition');
    }
  };
  
  const stopListening = async () => {
    try {
      if (isListening) {
        await Voice.stop();
      }
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
      actions.setError('Failed to stop voice recognition');
    }
  };
  
  const generateAndDisplayStory = async (summary?: string) => {
    if (phase === 'PROCESSING') {
      console.log('Already processing, cannot generate story');
      return;
    }
  
    try {
      actions.setPhase('GENERATING_STORY');
      await stopCurrentSpeech();
  
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
      
      actions.setStoryPages(generatedPages);
      
      if (phase !== 'INTERVIEWING' && !isSpeaking) {
        await speak(generatedPages[0].textContent);
      }
    } catch (error) {
      console.error('Error generating story:', error);
      await speak('I encountered an error while creating your story. Should we try again?');
      actions.setError('Failed to generate story');
    } 
  };
  
  const handleSaveStory = async (title?: string) => {
    try {
      await actions.saveStory(title);
    } catch (error) {
      console.error('Failed to save the story', error);
      actions.setError('Failed to save story');
    }
  };
  
  const handleLoadStory = async (id: string) => {
    try {
      await actions.loadStory(id);
      await speak(storyPages[0].textContent);
    } catch (error) {
      console.error('Failed to load story', error);
      actions.setError('Failed to load story');
    }
  };
  
  const startNewStory = async () => {
    if (phase === 'PROCESSING' || isSpeaking) {
      console.log('Cannot start new story - already processing or speaking');
      return;
    }
    
    try {
      await stopCurrentSpeech();
      await stopListening();
      
      actions.resetConversation();
      setTimeout(() => {
        actions.startConversation();
        startListening().catch(error => {
          console.error('Error starting listening:', error);
          actions.setError('Failed to start voice recognition');
        });
      }, 0);
    } catch (error) {
      console.error('Error starting new story:', error);
      actions.setError('Failed to start new story');
      await speak('I had trouble starting. Please try again.');
    }
  };
  
  const handleBack = async () => {
    try {
      await stopListening();
      await Speech.stop();
      actions.resetConversation();
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
        {phase === 'DISPLAYING_STORY' ? (
          <StoryDisplay
            storyPages={storyPages}
            currentPageIndex={currentPageIndex}
            onPageChange={actions.setCurrentPage}
          />
        ) : (
          <>
            <Text style={styles.currentQuestion}>{currentQuestion}</Text>
            <VoiceWave
              isListening={isListening}
              isSpeaking={isSpeaking}
            />
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
  processingText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 10,
    fontStyle: 'italic',
  },
});