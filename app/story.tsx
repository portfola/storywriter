import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import * as Speech from 'expo-speech';
import TranscribeService from '@/services/transcribe';
import HuggingFaceService from '@/services/huggingFaceService';

interface StorySection {
  text: string;
  imageUrl: string | null;
}

export default function StoryScreen() {
  const [question, setQuestion] = useState('What kind of story would you like?');
  const [responses, setResponses] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [conversationComplete, setConversationComplete] = useState(false);
  const [storyContent, setStoryContent] = useState<StorySection[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  /** 🔊 Starts voice transcription and handles user response */
  const startListening = async () => {
    try {
      setIsListening(true);
      await TranscribeService.startTranscription((transcript) => {
        if (['i\'m done', 'that\'s all', 'finish'].some(phrase => transcript.toLowerCase().includes(phrase))) {
          stopListening(); // Stop transcription
        } else {
          setResponses((prev) => [...prev, transcript]);
        }
      });
    } catch (error) {
      console.error('Transcription error:', error);
      alert('Failed to start listening.');
    }
  };

  /** 🛑 Stops voice transcription */
  const stopListening = async () => {
    await TranscribeService.stopTranscription();
    setIsListening(false);
    setConversationComplete(true);
    setTimeout(() => Speech.speak("Okay! I will now create your story."), 2000);
  };

  /** 🔄 Asks follow-up question if conversation is ongoing */
  useEffect(() => {
    if (!conversationComplete && !isListening) {
      const newQuestion = responses.length > 0
        ? "Do you have anything to add to your story?"
        : "What kind of story would you like?";
      setQuestion(newQuestion);
      setTimeout(() => {
        if (!isListening) Speech.speak(newQuestion);
      }, 2000);
    }
  }, [responses, conversationComplete, isListening]);

  /** 📖 Generates story and images */
  const generateStoryWithImages = async () => {
    setIsGenerating(true);
    try {
      const storyText = await HuggingFaceService.generateResponse(`Create a short children's story: ${responses.join(' ')}`);
      const sections = storyText.split('. ').map((text, index) => ({
        text,
        imageUrl: index < 2 ? HuggingFaceService.generateImage(text) : null,
      }));

      setStoryContent(await Promise.all(sections));
    } catch (error) {
      console.error("Error generating story:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <View style={styles.container}>
      {!conversationComplete ? (
        <>
          <Text style={styles.questionText}>{question}</Text>
          <TouchableOpacity style={styles.button} onPress={startListening} disabled={isListening}>
            <Text style={styles.buttonText}>{isListening ? 'Listening...' : 'Tap to Speak'}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <ScrollView style={styles.storyContainer}>
          {storyContent.map((section, index) => (
            <View key={index} style={styles.sectionContainer}>
              <Text style={styles.storyText}>{section.text}</Text>
              {section.imageUrl && <Image source={{ uri: section.imageUrl }} style={styles.storyImage} />}
            </View>
          ))}
        </ScrollView>
      )}
      {conversationComplete && (
        <TouchableOpacity style={styles.finishButton} onPress={generateStoryWithImages} disabled={isGenerating}>
          <Text style={styles.buttonText}>{isGenerating ? 'Generating...' : 'Generate Story'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/** 💅 Styles */
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f8ff', padding: 20 },
  questionText: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#2c3e50' },
  button: { backgroundColor: '#3498db', padding: 15, borderRadius: 10 },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  finishButton: { backgroundColor: '#2ecc71', padding: 15, borderRadius: 10, marginTop: 20 },
  storyContainer: { flex: 1, padding: 20, backgroundColor: '#fff' },
  storyText: { fontSize: 18, lineHeight: 26, color: '#2c3e50' },
  storyImage: { width: '100%', height: 200, marginVertical: 10 },
  sectionContainer: { marginBottom: 20 },
});
