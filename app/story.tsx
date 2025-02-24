import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import * as Speech from 'expo-speech';
import TranscribeService from '@/services/transcribe';
import HuggingFaceService from '@/services/huggingFaceService';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }
}

interface StorySection {
  text: string;
  imageUrl: string | null;
}

/**
 * StoryScreen: The main component responsible for the story creation process.
 * It interacts with the user via voice commands to gather input for story generation.
 * 
 * Features:
 * - Prompts the user with questions using text-to-speech.
 * - Records user's voice responses using s peech recognition.
 * - Manages conversation state and user responses.
 * - Generates a story based on collected responses using an AI service.
 * 
 * State:
 * - question: The current question being asked to the user.
 * - responses: List of user responses gathered during the session.
 * - isListening: Boolean indicating if the app is actively listening for voice input.
 * - conversationComplete: Boolean indicating if the user has finished providing input.
 * - generatedStory: The final story generated from the user's responses.
 * 
 * Usage:
 * - Tap the button to start speaking and provide input.
 * - The app will guide the user with questions and generate a story from the responses.
 */

export default function StoryScreen() {
  const [question, setQuestion] = useState('What kind of story would you like?');
  const [responses, setResponses] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [conversationComplete, setConversationComplete] = useState(false);
  const [storyContent, setStoryContent] = useState<StorySection[]>([]);
  const [generatedStory, setGeneratedStory] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  

  const startListening = async () => {
    try {
      setIsListening(true);
      
      await TranscribeService.startTranscription((transcript) => {
        // Check if they want to finish
        const isDone = ['i\'m done', 'that\'s all', 'finish'].some(
          phrase => transcript.toLowerCase().includes(phrase)
        );

        if (isDone) {
          TranscribeService.stopTranscription();
          setConversationComplete(true);
          Speech.speak("Okay! I will now create your story.");
        } else {
          setResponses(prev => [...prev, transcript]);
        }
      });
    } catch (error) {
      console.error('Transcription error:', error);
      alert('Failed to start listening. Please try again.');
    } finally {
      setIsListening(false);
    };

  };

    
  useEffect(() => {
    if (!conversationComplete) {
      const questionText = responses.length > 0 
        ? "Do you have anything to add to your story?" 
        : "What kind of story would you like?";
      setTimeout(() => Speech.speak(questionText), 2000);
      setQuestion(questionText);
    }
  }, [responses, conversationComplete]);


  const generateStory = async () => {
    try {
      const fullPrompt = `Create a children's story based on the following details:\n\n${responses.join(' ')}\n\nMake it engaging and appropriate for a 5-year-old.`;
      const response = await HuggingFaceService.generateResponse(fullPrompt);
      setGeneratedStory(response);
    } catch (error) {
      console.error("Error:", error);
      alert('Failed to generate story. Please try again.');
    }
  };


  const generateImage = async (prompt: string): Promise<string | null> => {
    try {
      // Assuming HuggingFaceService has an imageGeneration method
      const imageUrl = await HuggingFaceService.generateImage(
        `child-friendly, safe, cartoon style illustration of ${prompt}`
      );
      return imageUrl;
    } catch (error) {
      console.error('Image generation error:', error);
      return null;
    }
  };

  const splitStoryIntoSections = (story: string): string[] => {
    // Split story into sections based on paragraphs or sentences
    return story
      .split(/(?<=[.!?])\s+/)
      .reduce((acc: string[], sentence: string, i: number) => {
        if (i % 2 === 0) {
          acc.push(sentence);
        } else {
          acc[acc.length - 1] += ' ' + sentence;
        }
        return acc;
      }, []);
  };

  const generateStoryWithImages = async () => {
    setIsGenerating(true);
    try {
      // Generate the story text
      const fullPrompt = `Create a children's story based on the following details:\n\n${responses.join(' ')}\n\nMake it engaging and appropriate for a 5-year-old. Keep paragraphs short.`;
      const storyText = await HuggingFaceService.generateResponse(fullPrompt);
      
      // Split the story into sections
      const sections = splitStoryIntoSections(storyText);
      
      // Generate images for each section
      const storyWithImages = await Promise.all(
        sections.map(async (text): Promise<StorySection> => {
          const imageUrl = await generateImage(text);
          return { text, imageUrl };
        })
      );
      
      setStoryContent(storyWithImages);
    } catch (error) {
      console.error("Error:", error);
      alert('Failed to generate story. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };



  const stopListening = async () => {
    await TranscribeService.stopTranscription();
    setIsListening(false);
    setConversationComplete(true);
    Speech.speak("Okay! I will now create your story.");
  };

  return (
    <View style={styles.container}>
      {!generatedStory ? (
        <>
          <Text style={styles.questionText}>{question}</Text>

          {!conversationComplete && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={startListening} 
              disabled={isListening}
            >
              <Text style={styles.buttonText}>
                {isListening ? 'Listening...' : 'Tap to Speak'}
              </Text>
            </TouchableOpacity>

            {isListening && (
              <TouchableOpacity 
                style={[styles.button, styles.stopButton]} 
                onPress={stopListening}
              >
                <Text style={styles.buttonText}>Stop Listening</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

          {responses.length > 0 && (
            <View style={styles.responseContainer}>
              <Text style={styles.responseLabel}>Your story so far:</Text>
              {responses.map((res, index) => (
                <Text key={index} style={styles.responseText}>
                  {index + 1}. {res}
                </Text>
              ))}
            </View>
          )}

          {(conversationComplete || responses.length > 0) && (
            <TouchableOpacity 
              style={styles.finishButton} 
              onPress={generateStory}
            >
              <Text style={styles.buttonText}>Generate Story</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <ScrollView style={styles.storyContainer}>
          <Text style={styles.storyTitle}>Your Story:</Text>
          <Text style={styles.storyText}>{generatedStory}</Text>
  
        {storyContent.map((section, index) => (
          <View key={index} style={styles.sectionContainer}>
            <Text style={styles.storyText}>{section.text}</Text>
            {section.imageUrl && (
              <Image
                source={{ uri: section.imageUrl }}
                style={styles.storyImage}
                resizeMode="contain"
              />
            )}
          </View>
        ))}
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 20,
  },
  questionText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#2c3e50',
  },
  button: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 10,
  },
  finishButton: {
    backgroundColor: '#2ecc71',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  responseContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  responseLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2c3e50',
  },
  responseText: {
    fontSize: 16,
    color: '#34495e',
    marginBottom: 5,
  },
  storyContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  storyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  storyText: {
    fontSize: 18,
    lineHeight: 26,
    color: '#2c3e50',
  },
  sectionContainer: {
    marginBottom: 20,
  },
  storyImage: {
    width: 100, 
  }, 
});