import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import * as Speech from 'expo-speech';

import { HUGGINGFACE_API_KEY } from '@env';

export default function StoryScreen() {
  const [question, setQuestion] = useState<string>('What kind of story would you like?');
  const [responses, setResponses] = useState<string[]>([]);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [conversationComplete, setConversationComplete] = useState<boolean>(false);
  const [generatedStory, setGeneratedStory] = useState<string | null>(null);

  const API_URL = 'https://api-inference.huggingface.co/models/YOUR_MODEL_HERE'; // Replace with actual Hugging Face model

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Your browser does not support speech recognition. Please use Google Chrome.');
      return;
    }

    setIsListening(true);
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;

      // If user says they are done, finish conversation
      if (
        transcript.toLowerCase().includes("i'm done") ||
        transcript.toLowerCase().includes("that's all") ||
        transcript.toLowerCase().includes("finish")
      ) {
        setConversationComplete(true);
        Speech.speak("Okay! I will now create your story.");
      } else {
        setResponses((prevResponses) => [...prevResponses, transcript]);
      }

      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.start();
  };

  // Speak the initial question when the screen loads
  useEffect(() => {
    Speech.speak(question);
  }, [question]);

  // Handle follow-up question
  useEffect(() => {
    if (responses.length > 0 && !conversationComplete) {
      const nextQuestion = "Do you have anything to add to your story?";
      setTimeout(() => Speech.speak(nextQuestion), 1000);
      setQuestion(nextQuestion);
    }
  }, [responses, conversationComplete]);

  // Function to send the collected prompt to Hugging Face
  const generateStory = async () => {
    const fullPrompt = `Create a children's story based on the following details:\n\n${responses.join(' ')}\n\nMake it engaging and appropriate for a 5-year-old.`;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer YOUR_HUGGINGFACE_API_KEY`, // Replace with your Hugging Face API key
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: fullPrompt })
      });

      const result = await response.json();

      if (result && result.generated_text) {
        setGeneratedStory(result.generated_text);
        Speech.speak(result.generated_text);
      } else {
        setGeneratedStory('Sorry, I was unable to generate a story. Try again.');
      }
    } catch (error) {
      console.error('Error generating story:', error);
      setGeneratedStory('Error generating the story. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      {!generatedStory ? (
        <>
          <Text style={styles.questionText}>{question}</Text>

          {!conversationComplete && (
            <TouchableOpacity style={styles.button} onPress={startListening} disabled={isListening}>
              <Text style={styles.buttonText}>{isListening ? 'Listening...' : 'Tap to Speak'}</Text>
            </TouchableOpacity>
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
            <TouchableOpacity style={styles.finishButton} onPress={generateStory}>
              <Text style={styles.buttonText}>Generate Story</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <ScrollView style={styles.storyContainer}>
          <Text style={styles.storyTitle}>Your Story:</Text>
          <Text style={styles.storyText}>{generatedStory}</Text>
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
});

