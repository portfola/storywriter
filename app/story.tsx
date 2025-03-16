import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import * as Speech from 'expo-speech';
import TranscribeService from '@/services/transcribe';
import HuggingFaceService from '@/services/huggingFaceService';
import { usePolly } from '@/hooks/usePolly';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }
}

interface StorySection {
  text: string;
  imageUrl: string | null;
}

interface StoryState {
  question: string;
  responses: string[];
  isListening: boolean;
  conversationComplete: boolean;
  isGenerating: boolean;
  storyContent: StorySection[];
  generatedStory: string | null;
}

interface StoryContent {
  content: string | null;
  sections: StorySection[];
}

/**
 * StoryScreen: Interactive story creation using voice input and AI generation
 */
export default function StoryScreen() {
  // Combined state management
  const [storyState, setStoryState] = useState<StoryState>({
    question: 'What kind of story shall we create together?',
    responses: [],
    isListening: false,
    conversationComplete: false,
    isGenerating: false,
    storyContent: [],
    generatedStory: null
  });
  
  const { speak, stop } = usePolly();

  const [story, setStory] = useState<StoryContent>({
    content: null,
    sections: []
  });

  // Handle speech prompts
  useEffect(() => {
    if (!storyState.conversationComplete) {
      const questionText = storyState.responses.length > 0 
        ? "OK, and what else?" 
        : "What kind of story shall we create together?";
      stop();
      setTimeout(() => speak(questionText), 3000);
      setStoryState(prev => ({...prev, question: questionText}));
    }
  }, [storyState.responses, storyState.conversationComplete]);

  // Polly cleanup
  useEffect(() => {
    return () => {
      stop(); // Cleanup when component unmounts
    };
  }, [stop]);

  // Start voice transcription
  const startListening = async () => {
    try {
      setStoryState(prev => ({...prev, isListening: true}));
      stop(); // Stop any ongoing speech before listening
      
      await TranscribeService.startTranscription((transcript) => {
        const isDone = ['i\'m done', 'that\'s all', 'finish'].some(
          phrase => transcript.toLowerCase().includes(phrase)
        );

        if (isDone) {
          TranscribeService.stopTranscription();
          setStoryState(prev => ({..prev, conversationComplete: true}));
          speak("Okay! Let's create our story.");
        } else {
          setStoryState(prev => ({
            ...prev, 
            responses: [...prev.responses, transcript]
          }));
        }
      });
    } catch (error) {
      console.error('Transcription error:', error);
      alert('Failed to start listening. Please try again.');
    }
  };

  // Handle conversation completion
  const handleConversationComplete = () => {
    TranscribeService.stopTranscription();
    setStoryState(prev => ({
      ...prev, 
      isListening: false, 
      conversationComplete: true
    }));
    
    setTimeout(() => {
      Speech.speak("Okay! I will now create your story.");
    }, 1000);
  };

  // Generate story with image
  const generateStoryWithImages = async () => {
    stop();
    setStoryState(prev => ({...prev, isGenerating: true}));
    
    try {
      console.log('🔄 Generating story with images...');
    
      // Generate story text
      const storyText = await HuggingFaceService.generateResponse(
        `Create a children's story based on: ${storyState.responses.join(' ')}`
      );
      console.log('📝 Story text received');
      
      // Set initial story content
      setStory(prev => ({...prev, content: storyText}));
      
      // Generate one image for the story
      const imageUrl = await HuggingFaceService.generateImage(storyText);
      console.log('🖼️ Image generated');
      
      // Update with completed story and image
      setStory({
        content: storyText,
        sections: [{ text: storyText, imageUrl }]
      });
    } catch (error) {
      console.error("❌ Error generating story:", error);
      alert('Failed to generate story. Please try again.');
    } finally {
      setStoryState(prev => ({...prev, isGenerating: false}));
    }
  };

  // Render response list
  const renderResponses = () => (
    <View style={styles.responseContainer}>
      <Text style={styles.responseLabel}>Your story so far:</Text>
      {storyState.responses.map((res, index) => (
        <Text key={index} style={styles.responseText}>
          {index + 1}. {res}
        </Text>
      ))}
    </View>
  );

  // Render speech input buttons
  const renderSpeechButtons = () => (
    <View style={styles.buttonContainer}>
      <TouchableOpacity 
        style={styles.button} 
        onPress={startListening} 
        disabled={storyState.isListening}
      >
        <Text style={styles.buttonText}>
          {storyState.isListening ? 'Listening...' : 'Tap to Speak'}
        </Text>
      </TouchableOpacity>
      
      {storyState.isListening && (
        <TouchableOpacity 
          style={[styles.button, styles.stopButton]} 
          onPress={handleConversationComplete}
        >
          <Text style={styles.buttonText}>Stop Listening</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Render generate button
  const renderGenerateButton = () => (
    <TouchableOpacity 
      style={styles.finishButton} 
      onPress={generateStoryWithImages}
      disabled={storyState.isGenerating}
    >
      <Text style={styles.buttonText}>
        {storyState.isGenerating ? 'Generating...' : 'Generate Story with Images'}
      </Text>
    </TouchableOpacity>
  );

  // Render story content
  const renderStoryContent = () => (
    <ScrollView style={styles.storyContainer}>
      {storyState.isGenerating ? (
        <ActivityIndicator size="large" color="#3498db" />
      ) : (
        <>
          {story.sections.length > 0 && story.sections[0].imageUrl ? (
            <>
              <Image 
                source={{ uri: story.sections[0].imageUrl }} 
                style={styles.storyImage} 
                resizeMode="contain" 
              />
              <Text style={styles.storyText}>{story.sections[0].text}</Text>
            </>
          ) : (
            <Text style={styles.storyText}>Loading story...</Text>
          )}
        </>
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {!story.content ? (
        <>
          <Text style={styles.questionText}>{storyState.question}</Text>
          {!storyState.conversationComplete && renderSpeechButtons()}
          {storyState.responses.length > 0 && renderResponses()}
          {(storyState.conversationComplete || storyState.responses.length > 0) && 
            renderGenerateButton()}
        </>
      ) : (
        renderStoryContent()
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
  storyText: {
    fontSize: 18,
    lineHeight: 26,
    color: '#2c3e50',
  },
  storyImage: {
    width: '100%',
    height: 200,
    marginVertical: 10,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  stopButton: {
    marginTop: 20,
  },
});