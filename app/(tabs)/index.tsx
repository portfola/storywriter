import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import Voice, { SpeechResultsEvent } from '@react-native-voice/voice';
import { router } from 'expo-router';

import HuggingFaceService from '@/services/huggingFaceService';
import QuestionArea from '@/components/QuestionArea';
import StoryDisplay from '@/components/StoryDisplay';
import SpeechControls from '@/components/SpeechControls';
import StoryManagement from '@/components/StoryManagement';
import { StoryPage } from '@/src/utils/storyGenerator';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f8ff',
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
  thinkingText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 10,
    fontStyle: 'italic',
  }
});

interface SavedStory {
  title: string;
  content: StoryPage[];
  elements: { [key: string]: string };
}

interface ConversationTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export default function TabOneScreen() {
  const [storyElements, setStoryElements] = useState<{[key: string]: string}>({});
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

  useEffect(() => {
    Voice.onSpeechResults = onSpeechResults;
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
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
    setIsGeneratingQuestion(true);
    try {
      const prompt = `Based on our conversation so far, ask the next question to gather more details for a children's story. 
      If you have enough information (after 3-5 questions) to create an engaging story, respond with "INTERVIEW_COMPLETE" 
      followed by a summary of the story elements.
  
      Current conversation:
      ${conversationHistory.map(turn => `${turn.role}: ${turn.content}`).join('\n')}`;
  
      console.log('Sending prompt to HuggingFaceService:', prompt);
      const response = await HuggingFaceService.generateResponse(prompt);
      console.log('LLM Response:', response);
      
      if (response.includes('INTERVIEW_COMPLETE')) {
        setIsInterviewing(false);
        const summary = response.split('INTERVIEW_COMPLETE')[1].trim();
        console.log('Interview complete! Summary:', summary);
        await generateAndDisplayStory(summary);
      } else {
        const nextQuestion = response.trim();
        setCurrentQuestion(nextQuestion);
        speak(nextQuestion, true);
      }
    } catch (error: unknown) {
      console.error('Error generating question:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.stack);
      } else {
        console.error('Unknown error occurred');
      }
      speak('I had trouble thinking of the next question. Should we try again?');
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  const handleAnswer = async (answer: string) => {
    if (!answer) return;

    if (isInterviewing) {
      const updatedHistory: ConversationTurn[] = [
        ...conversationHistory,
        { role: 'user' as const, content: answer },
      ];
      setConversationHistory(updatedHistory);
      await generateNextQuestion();
    }
  };

  const speak = async (text: string, isQuestion = false) => {
    if (isSpeaking) {
      await Speech.stop();
    }

    setIsSpeaking(true);
    await Speech.speak(text, {
      rate: speechRate,
      volume: speechVolume,
      onDone: () => {
        setIsSpeaking(false);
        if (!isQuestion) {
          setTimeout(() => {
            if (currentPageIndex < storyPages.length - 1) {
              setCurrentPageIndex(prev => prev + 1);
              speak(storyPages[currentPageIndex + 1].textContent);
            }
          }, 3000);
        }
      }
    });
  };

  const handleInterruption = (text: string) => {
    console.log("Interruption:", text);
  };

  const toggleListening = async () => {
    try {
      if (isListening) {
        await Voice.stop();
      } else {
        await Voice.start('en-US');
      }
      setIsListening(!isListening);
    } catch (e) {
      console.error(e);
    }
  };

  const generateAndDisplayStory = async (summary?: string) => {
    try {
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
        const text = response.split('.').filter(Boolean);
        const pageSize = Math.ceil(text.length / 5);
        generatedPages = Array(5).fill(null).map((_, i) => ({
          textContent: text.slice(i * pageSize, (i + 1) * pageSize).join('.') + '.'
        }));
      }
      
      setStoryPages(generatedPages);
      setCurrentPageIndex(0);
      speak(generatedPages[0].textContent);
    } catch (error) {
      console.error('Error generating story:', error);
      speak('I encountered an error while creating your story. Should we try again?');
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

  const startNewStory = () => {
    setIsInterviewing(true);
    setStoryElements({});
    setStoryPages([]);
    const initialConversation: ConversationTurn[] = [{
      role: 'system' as const,
      content: `You are a friendly children's story creator assistant. Interview the user to gather details for their story. 
      Ask one question at a time. Keep questions simple and child-friendly. 
      After 2-3 questions, when you have enough information, respond with "INTERVIEW_COMPLETE" followed by a summary of the story elements.`
    }];
    setConversationHistory(initialConversation);
    
    const initialQuestion = "What kind of story would you like to create today?";
    setCurrentQuestion(initialQuestion);
    speak(initialQuestion, true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.push('/')}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        {isInterviewing ? (
          <>
            <QuestionArea
              question={currentQuestion}
              onAnswer={handleAnswer}
              onVoiceInput={toggleListening}
              isListening={isListening}
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
              onBack={() => router.push('/')}
            />
          </>
        )}
      </View>
    </View>
  );
}