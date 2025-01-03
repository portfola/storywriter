import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import Voice, { SpeechResultsEvent } from '@react-native-voice/voice';
import { router } from 'expo-router';

import HuggingFaceService from '@/services/huggingFaceService';
import StoryDisplay from '@/components/StoryDisplay';
import SpeechControls from '@/components/SpeechControls';
import StoryManagement from '@/components/StoryManagement';
import { StoryPage } from '@/src/utils/storyGenerator';

interface ConversationTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface SavedStory {
  title: string;
  content: StoryPage[];
  elements: { [key: string]: string };
}

const VoiceWave: React.FC<{ isListening: boolean; isSpeaking: boolean }> = ({ isListening, isSpeaking }) => {
  const [waveAmplitudes] = useState(
    Array(10).fill(0).map(() => new Animated.Value(10))
  );

  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      if (isListening || isSpeaking) {
        waveAmplitudes.forEach(amplitude => {
          Animated.timing(amplitude, {
            toValue: Math.random() * 40 + 10,
            duration: 100,
            useNativeDriver: false,
          }).start();
        });
      } else {
        waveAmplitudes.forEach(amplitude => {
          Animated.timing(amplitude, {
            toValue: 10,
            duration: 100,
            useNativeDriver: false,
          }).start();
        });
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isListening, isSpeaking, waveAmplitudes]);

  return (
    <View style={styles.waveContainer}>
      {waveAmplitudes.map((amplitude, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              height: amplitude,
              backgroundColor: isListening ? '#ff6b6b' : (isSpeaking ? '#4ecdc4' : '#dddddd')
            }
          ]}
        />
      ))}
    </View>
  );
};

export default function TabOneScreen() {
  const [storyElements, setStoryElements] = useState<{ [key: string]: string }>({});
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [storyPages, setStoryPages] = useState<StoryPage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechVolume, setSpeechVolume] = useState(1.0);
  const [savedStories, setSavedStories] = useState<SavedStory[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [isInterviewing, setIsInterviewing] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Initialize voice recognition and start the interview process
    const initializeVoice = async () => {
      try {
        // Set up all voice event listeners
        Voice.onSpeechStart = () => setIsListening(true);
        Voice.onSpeechEnd = () => setIsListening(false);
        Voice.onSpeechError = (error) => {
          console.error('Speech error:', error);
          setIsListening(false);
        };
        Voice.onSpeechResults = onSpeechResults;
  
        // Check platform-specific permissions if needed
        // Note: On iOS, permissions are automatically requested when starting Voice
        await startNewStory();
      } catch (error) {
        console.error('Error initializing voice:', error);
        speak("I had trouble initializing voice recognition. Please check your microphone permissions.");
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

  const onSpeechResults = (e: SpeechResultsEvent) => {
    const text = e.value?.[0];
    if (text) {
      if (isSpeaking) {
        handleInterruption(text);
      } else {
        handleAnswer(text);
      }
    }
  };

  const generateNextQuestion = async () => {
    // Comprehensive state check before proceeding
    if (!isInterviewing) {
      console.log('Not in interview mode, skipping question generation');
      return;
    }
  
    if (isProcessing || isSpeaking) {
      console.log('Blocked question generation:', { isProcessing, isSpeaking });
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
      setIsProcessing(true);
      setIsGeneratingQuestion(true);
  
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
      setIsGeneratingQuestion(false);
      setIsProcessing(false);
    }
  };

  const handleAnswer = async (answer: string) => {
    console.log('Received answer:', { 
      answer: answer?.slice(0, 50) + '...', 
      isProcessing, 
      isInterviewing,
      isListening,
      isSpeaking
    });
    
    // Validate input and state
    if (!answer?.trim()) {
      console.log('Empty answer received, ignoring');
      return;
    }
  
    if (!isInterviewing) {
      console.log('Not in interview mode, ignoring answer');
      return;
    }
  
    if (isProcessing || isSpeaking) {
      console.log('Cannot process answer - already processing or speaking');
      return;
    }
  
    try {
      setIsProcessing(true);
      
      // Stop listening while processing the answer
      await stopListening();
      
      // Update conversation history
      const updatedHistory = [
        ...conversationHistory,
        { role: 'user' as const, content: answer }
      ];
      console.log('Updating conversation history:', updatedHistory);
      setConversationHistory(updatedHistory);
  
      // Small delay to ensure state updates are processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Generate next question
      await generateNextQuestion();
      
      // Resume listening after processing (if still in interview mode)
      if (isInterviewing && !isProcessing && !isSpeaking) {
        await startListening();
      }
    } catch (error) {
      console.error('Error handling answer:', error);
      speak('I had trouble processing your answer. Could you try again?');
    } finally {
      setIsProcessing(false);
    }
  };

  const speak = async (text: string, isQuestion = false) => {
    // Don't start new speech if we're processing
    if (isProcessing) {
      console.log('Currently processing, cannot start speech');
      return;
    }
  
    try {
      // Cancel any ongoing speech
      if (isSpeaking) {
        await Speech.stop();
      }
  
      setIsSpeaking(true);
      
      await Speech.speak(text, {
        rate: speechRate,
        volume: speechVolume,
        onStart: () => {
          console.log('Speech started:', text.slice(0, 50) + '...');
        },
        onDone: () => {
          console.log('Speech completed');
          setIsSpeaking(false);
          
          // Only auto-advance for story pages, not questions
          if (!isQuestion && currentPageIndex < storyPages.length - 1) {
            // Add a small delay before next page
            setTimeout(() => {
              setCurrentPageIndex(prev => prev + 1);
              speak(storyPages[currentPageIndex + 1].textContent);
            }, 2000);
          }
        },
        onStopped: () => {
          console.log('Speech stopped');
          setIsSpeaking(false);
        },
        onError: (error) => {
          console.error('Speech error:', error);
          setIsSpeaking(false);
        }
      });
    } catch (error) {
      console.error('Error in speak function:', error);
      setIsSpeaking(false);
    }
  };

  const stopCurrentSpeech = async () => {
    try {
      if (isSpeaking) {
        await Speech.stop();
        setIsSpeaking(false);
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
    if (!isInterviewing && (text.toLowerCase().includes('next') || text.toLowerCase().includes('continue'))) {
      if (currentPageIndex < storyPages.length - 1) {
        setCurrentPageIndex(prev => prev + 1);
        speak(storyPages[currentPageIndex + 1].textContent);
      }
    }
  };

  const startListening = async () => {
    try {
      if (!isListening) {
        const isAvailable = await Voice.isAvailable();
        if (!isAvailable) {
          console.error('Voice recognition is not available on this device');
          return;
        }
        await Voice.start('en-US');
        setIsListening(true);
      }
    } catch (e) {
      console.error('Error starting voice recognition:', e);
      if (e instanceof Error) {
        console.error('Error message:', e.message);
        console.error('Error stack:', e.stack);
      }
    }
  };

  const stopListening = async () => {
    try {
      if (isListening) {
        await Voice.stop();
        setIsListening(false);
      }
    } catch (e) {
      console.error('Error stopping voice recognition:', e);
    }
  };

  const generateAndDisplayStory = async (summary?: string) => {
    if (isProcessing) {
      console.log('Already processing, cannot generate story');
      return;
    }
  
    try {
      setIsProcessing(true);
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
      if (!isProcessing && !isSpeaking) {
        await speak(generatedPages[0].textContent);
      }
    } catch (error) {
      console.error('Error generating story:', error);
      speak('I encountered an error while creating your story. Should we try again?');
    } finally {
      setIsProcessing(false);
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
    console.log('Starting new story:', { isProcessing, isSpeaking });
    
    if (isProcessing || isSpeaking) {
      console.log('Cannot start new story - already processing or speaking');
      return;
    }
    
    try {
      setIsProcessing(true);
      
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
      setIsProcessing(false);
    }
  };

  const handleBack = async () => {
    try {
      setIsProcessing(true);
      await stopListening();
      await stopCurrentSpeech();
      setIsGeneratingQuestion(false);
      setConversationHistory([]);
      setCurrentQuestion('');
      setStoryPages([]);
      router.push('/');
    } catch (error) {
      console.error('Error during navigation:', error);
    } finally {
      setIsProcessing(false);
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
        {isInterviewing ? (
          <>
            <Text style={styles.currentQuestion}>{currentQuestion}</Text>
            <VoiceWave
              isListening={isListening}
              isSpeaking={isSpeaking}
            />
            {isGeneratingQuestion && (
              <Text style={styles.thinkingText}>Thinking of next question...</Text>
            )}
          </>
        ) : (
          <>
            <StoryDisplay
              storyPages={storyPages}
              currentPageIndex={currentPageIndex}
              onPageChange={setCurrentPageIndex}
            />
            <SpeechControls
              speechRate={speechRate}
              onSpeechRateChange={setSpeechRate}
              speechVolume={speechVolume}
              onSpeechVolumeChange={setSpeechVolume}
            />
            <StoryManagement
              onSave={saveStory}
              onLoad={loadStory}
              savedStories={savedStories}
              onBack={handleBack}
            />
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