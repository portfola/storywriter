// components/WelcomeScreen.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Speech from 'expo-speech';

interface WelcomeScreenProps {
  onNewStory: () => void;
  onOpenLibrary: () => void;
}

export default function WelcomeScreen({ onNewStory, onOpenLibrary }: WelcomeScreenProps) {
  React.useEffect(() => {
    Speech.speak('Welcome! Would you like to create a new story or open a previous one?');
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Story Writer</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.createButton]} 
          onPress={onNewStory}
        >
          <Text style={styles.buttonText}>Create New Story</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, styles.libraryButton]} 
          onPress={onOpenLibrary}
        >
          <Text style={styles.buttonText}>Open Previous Story</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#FF69B4',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 20,
  },
  button: {
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  createButton: {
    backgroundColor: '#3498db',
  },
  libraryButton: {
    backgroundColor: '#2ecc71',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});