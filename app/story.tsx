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
          // Speech.speak("Okay! I will now create your story.");
          setTimeout(() => Speech.speak("Okay! I will now create your story."), 2000); // ✅ Delayed speech
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
        setTimeout(() => {
          if (!isListening) { // ✅ Double check before speaking
            Speech.speak(questionText);
          }
        }, 2000);
      setQuestion(questionText);
    }
  }, [responses, conversationComplete, isListening]);


  const generateStory = async () => {
    try {
      const fullPrompt = `Create a children's story based on the following details:\n\n${responses.join(' ')}\n\nMake it engaging and appropriate for a 5-year-old.`;
      const response = await HuggingFaceService.generateResponse(fullPrompt);
      console.log('response: '  + response);
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
      console.log('imageUrl: ' + imageUrl);
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


  // 
  

  const generateStoryWithImages = async () => {
    setIsGenerating(true);
    try {
      console.log('🔄 Generating story with images...');
    
      // ✅ First, generate the story text
      // const storyText = await HuggingFaceService.generateResponse(
      //   `Create a children's story based on: ${responses.join(' ')}`
      // );
      
      const storyText = await HuggingFaceService.generateResponse(responses.join(' '));
      
      console.log('📝 Story text received:', storyText);
      setGeneratedStory(storyText); // ✅ Set the text immediately

      // ✅ Now, process the story into sections
      const sections = storyText.split('. ').slice(0, 2).map((text, index) => ({
        text,
        imageUrl: index === 0 ? HuggingFaceService.generateImage(text) : null, // ✅ Only first section gets an image
      }));

      // ✅ Step 2: Generate the image (based on full story)
    const imageUrl = await HuggingFaceService.generateImage(storyText);
    console.log('🖼️ Image generated:', imageUrl);
      

    
      // ✅ Resolve image promise only for one section
      const storyWithImages = await Promise.all(
        sections.map(async (section, index) => ({
          imageUrl: index === 0 ? await section.imageUrl : null, // ✅ Ensure only first section gets an image
          text: section.text,
        }))
      );

      // const storyWithImages = [{
      //   text: storyText, // ✅ Full story in one block
      //   imageUrl: await HuggingFaceService.generateImage(storyText), // ✅ One image for the entire story
      // }];
      
      // setStoryContent(storyWithImages); // ✅ Save to state
      // ✅ Step 3: Update state together (ensures simultaneous rendering)
      // setStoryContent([{ text: storyText, imageUrl }]);
      
    
      console.log('🖼️ Story sections with images:', storyWithImages);
      
      setStoryContent(storyWithImages); // ✅ Update state
    } catch (error) {
      console.error("❌ Error generating story:", error);
    } finally {
      setIsGenerating(false);
    }
  };
  

  const stopListening = async () => {
    await TranscribeService.stopTranscription();
    setIsListening(false);
    setConversationComplete(true);
    // Speech.speak("Okay! I will now create your story.");
    setTimeout(() => {
      Speech.speak("Okay! I will now create your story.");
    }, 2000); // ✅ Delayed to avoid overlap
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
              onPress={generateStoryWithImages}
              disabled={isGenerating}
            >
                 <Text style={styles.buttonText}>
                  {isGenerating ? 'Generating...' : 'Generate Story with Images'}
                </Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <ScrollView style={styles.storyContainer}>
          <Text style={styles.storyTitle}>Your Story:</Text>
          <Text style={styles.storyText}>{generatedStory}</Text>

        {/* Debugging: Show JSON of storyContent */}
        <Text style={{ fontSize: 10, color: 'red' }}>DEBUG: {JSON.stringify(storyContent, null, 2)}</Text>

        {storyContent.map((section, index) => (
          <View key={index} style={styles.sectionContainer}>
            {section.imageUrl && section.imageUrl.startsWith("data:image/jpeg;base64,") && (
              <Image
                source={{ uri: section.imageUrl }}
                style={styles.storyImage}
                resizeMode="contain"
              />
            )}
            <Text style={styles.storyText}>{section.text}</Text>
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
  storyImage: {
    width: '100%', // Set this to full width
    height: 200,   // Add a fixed height
    marginVertical: 10,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  stopButton: {
    marginTop: 20,
  },
});