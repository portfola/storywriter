import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Speech from 'expo-speech';

export default function StoryScreen() {
  const [question, setQuestion] = useState<string>('What kind of story would you like?');
  const [responses, setResponses] = useState<string[]>([]);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [conversationComplete, setConversationComplete] = useState<boolean>(false);

//   const [userResponse, setUserResponse] = useState<string>('');
//   const [isListening, setIsListening] = useState<boolean>(false);

  // Function to handle speech recognition
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
    //   setUserResponse(transcript);
      setResponses((prevResponses) => [...prevResponses, transcript]);
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

    // Handle continuing the conversation
    useEffect(() => {
        if (responses.length > 0 && !conversationComplete) {
          const nextQuestion = "Do you have anything to add to your story?";
          setTimeout(() => Speech.speak(nextQuestion), 1000);
          setQuestion(nextQuestion);
        }
      }, [responses, conversationComplete]);

  return (
    <View style={styles.container}>
      <Text style={styles.questionText}>{question}</Text>

      <TouchableOpacity style={styles.button} onPress={startListening} disabled={isListening}>
        <Text style={styles.buttonText}>{isListening ? 'Listening...' : 'Tap to Speak'}</Text>
      </TouchableOpacity>

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

      {responses.length > 0 && (
        <TouchableOpacity
          style={styles.finishButton}
          onPress={() => setConversationComplete(true)}
        >
          <Text style={styles.buttonText}>Generate Story</Text>
        </TouchableOpacity>
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
});

