import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import Voice from '@react-native-voice/voice';

import QuestionArea from '../components/QuestionArea';
import StoryDisplay from '../components/StoryDisplay';
import SpeechControls from '../components/SpeechControls';
import StoryManagement from '../components/StoryManagement';

import { questions, storyTemplates, placeholderMapping } from '../src/data/storyData';
import { generateStory } from '../src/utils/storyGenerator';

export default function Index() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [storyElements, setStoryElements] = useState<{[key: string]: string}>({});
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [storyPages, setStoryPages] = useState<{textContent: string}[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechVolume, setSpeechVolume] = useState(1.0);
  const [savedStories, setSavedStories] = useState<{title: string, content: {textContent: string}[], elements: {[key: string]: string}}[]>([]);

  useEffect(() => {
    Voice.onSpeechResults = onSpeechResults;
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const onSpeechResults = (e: any) => {
    const text = e.value[0];
    if (isSpeaking) {
      handleInterruption(text);
    } else {
      handleAnswer(text);
    }
  };

  const handleAnswer = (answer: string) => {
    if (answer) {
      setStoryElements(prev => ({
        ...prev,
        [questions[currentQuestionIndex]]: answer
      }));
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const speak = async (text: string, isQuestion = false) => {
    if (isSpeaking) {
      await Speech.stop();
    }

    setIsSpeaking(true);
    await Speech.speak(text, {
      rate: speechRate,
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

  const generateAndDisplayStory = () => {
    const generatedStory = generateStory(storyTemplates, storyElements, placeholderMapping);
    setStoryPages(generatedStory);
    setCurrentPageIndex(0);
    speak(generatedStory[0].textContent);
  };

  const saveStory = async () => {
    const newStory = {
      title: `The Amazing Adventures of ${storyElements[questions[0]]}`,
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

  useEffect(() => {
    if (currentQuestionIndex >= questions.length) {
      generateAndDisplayStory();
    } else {
      speak(questions[currentQuestionIndex], true);
    }
  }, [currentQuestionIndex]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Story Writer</Text>
      {currentQuestionIndex < questions.length ? (
        <QuestionArea
          question={questions[currentQuestionIndex]}
          onAnswer={handleAnswer}
          onVoiceInput={toggleListening}
          isListening={isListening}
        />
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
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f8ff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#FF69B4',
  },
});