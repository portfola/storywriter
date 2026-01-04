import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'; // Removed Animated temporarily to pass linting

interface WelcomeOverlayProps {
  onStart: () => void;
  visible: boolean;
}

/**
 * WelcomeOverlay Component
 *
 * Displays a welcoming call-to-action overlay for children
 * when they first enter the StoryWriter experience.
 */
const WelcomeOverlay: React.FC<WelcomeOverlayProps> = ({ onStart, visible }) => {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.titleContainer}>
          <Text style={styles.welcomeText}>Welcome to</Text>
          <Text style={styles.labTitle}>The StoryWriter Lab!</Text>
          <View style={styles.decorativeLine} />
        </View>

        <Text style={styles.subtitle}>
          Let's create an amazing story together!
        </Text>

        <TouchableOpacity
          style={styles.startButton}
          onPress={onStart}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Create a Story ✨</Text>
        </TouchableOpacity>

        <Text style={styles.instruction}>
          Tap the button to speak with a lab assistant.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 32,
    padding: 40,
    maxWidth: 600,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 4,
    borderColor: '#FFD93D',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#555',
    textAlign: 'center',
  },
  labTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: 8,
    textShadowColor: 'rgba(255, 107, 107, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
  },
  decorativeLine: {
    width: 160,
    height: 6,
    backgroundColor: '#FFD93D',
    borderRadius: 3,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 22,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 32,
  },
  startButton: {
    backgroundColor: '#4ECDC4',
    paddingVertical: 20,
    paddingHorizontal: 48,
    borderRadius: 24,
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#45B8B0',
    marginBottom: 20,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  instruction: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
    maxWidth: 400,
  },
});

export default WelcomeOverlay;
