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
      <TouchableOpacity
        style={styles.startButton}
        onPress={onStart}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Create a Story</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 20,
    paddingTop: 175,
  },
  startButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 24,
    paddingHorizontal: 56,
    borderRadius: 32,
    borderWidth: 5,
    borderColor: '#2D2D2D',
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 12,
    transform: [{ rotate: '-1deg' }],
  },
  buttonText: {
    color: '#FFFEF7',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: '#2D2D2D',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
});

export default WelcomeOverlay;
