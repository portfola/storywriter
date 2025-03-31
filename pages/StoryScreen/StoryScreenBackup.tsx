import { s } from "./StoryScreen.style";

import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import React, { useState, useEffect } from 'react';
import TranscribeService from '@/services/transcribe';
import HuggingFaceService from '@/services/huggingFaceService';
import { usePolly } from '@/hooks/usePolly';

import Layout from '../../components/Layout/Layout';

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
  // Shouldn't `useState` be called somwhere?
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
          setStoryState(prev => ({...prev, conversationComplete: true}));
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
      speak("Okay! I will now create your story.");
    }, 2000);
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
    <View style={s.responseContainer}>
      <Text style={s.responseLabel}>Your story so far:</Text>
      {storyState.responses.map((res, index) => (
        <Text key={index} style={s.responseText}>
          {index + 1}. {res}
        </Text>
      ))}
    </View>
  );

  // Render speech input buttons
  const renderSpeechButtons = () => (
    <View style={s.buttonContainer}>
      <TouchableOpacity 
        style={s.button} 
        onPress={startListening} 
        disabled={storyState.isListening}
      >
        <Text style={s.buttonText}>
          {storyState.isListening ? 'Listening...' : 'Tap to Speak'}
        </Text>
      </TouchableOpacity>
      
      {storyState.isListening && (
        <TouchableOpacity 
          style={[s.button, s.stopButton]} 
          onPress={handleConversationComplete}
        >
          <Text style={s.buttonText}>Stop Listening</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Render generate button
  const renderGenerateButton = () => (
    <TouchableOpacity 
      style={s.finishButton} 
      onPress={generateStoryWithImages}
      disabled={storyState.isGenerating}
    >
      <Text style={s.buttonText}>
        {storyState.isGenerating ? 'Generating...' : 'Generate Story with Images'}
      </Text>
    </TouchableOpacity>
  );

  // Render story content
  const renderStoryContent = () => (
    <ScrollView style={s.storyContainer}>
      {storyState.isGenerating ? (
        <ActivityIndicator size="large" color="#3498db" />
      ) : (
        <>
          {story.sections.length > 0 && story.sections[0].imageUrl ? (
            <>
              <Image 
                source={{ uri: story.sections[0].imageUrl }} 
                style={s.storyImage} 
                resizeMode="contain" 
              />
              <Text style={s.storyText}>{story.sections[0].text}</Text>
            </>
          ) : (
            <Text style={s.storyText}>Loading story...</Text>
          )}
        </>
      )}
    </ScrollView>
  );

  return (
    <Layout>
    <View style={s.container}>
      {!story.content ? (
        <>
          <Text style={s.questionText}>{storyState.question}</Text>
          {!storyState.conversationComplete && renderSpeechButtons()}
          {storyState.responses.length > 0 && renderResponses()}
          {(storyState.conversationComplete || storyState.responses.length > 0) && 
            renderGenerateButton()}
        </>
      ) : (
        renderStoryContent()
      )}
    </View>
    </Layout>
  );
}
