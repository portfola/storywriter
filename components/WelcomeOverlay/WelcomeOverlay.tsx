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
        <TouchableOpacity
          style={styles.startButton}
          onPress={onStart}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Create a Story</Text>
        </TouchableOpacity>
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
    borderRadius: 24,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FFD93D',
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
  },
  buttonText: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});

export default WelcomeOverlay;
