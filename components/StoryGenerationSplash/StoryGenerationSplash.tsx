import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useConversationStore } from '@/src/stores/conversationStore';

// --- CONFIGURATION ---
const LOADING_MESSAGES = [
  { text: "Creating your story...", emoji: "✨", duration: 3000 },
  { text: "Adding magical illustrations...", emoji: "🎨", duration: 3500 },
  { text: "Almost ready!", emoji: "🌟", duration: 2000 }
];

const ERROR_MESSAGES = [
  "Oops! Our story machine needs a quick break. Let's try again! 🔧",
  "The story elves are working extra hard! Please wait a moment... 🧝‍♀️",
  "Sometimes even the best storytellers need a moment to think! 📚"
];

// --- SUB-COMPONENT: ERROR VIEW ---
const ErrorView = ({ onRetry }: { onRetry: () => void }) => {
  const randomMsg = ERROR_MESSAGES[Math.floor(Math.random() * ERROR_MESSAGES.length)];

  return (
    <View style={styles.card}>
      <Text style={styles.emojiLarge}>😊</Text>
      <Text style={styles.messageText}>{randomMsg}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryText}>Try Again! 🚀</Text>
      </TouchableOpacity>
    </View>
  );
};

// --- SUB-COMPONENT: LOADING VIEW ---
const LoadingView = () => {
  const [index, setIndex] = useState(0);
  const [bounceAnim] = useState(new Animated.Value(0));

  // 1. Cycle Messages Logic
  useEffect(() => {
    const currentDuration = LOADING_MESSAGES[index].duration;
    const timer = setTimeout(() => {
      setIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, currentDuration);
    return () => clearTimeout(timer);
  }, [index]);

  // 2. Simple Bounce Animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -20, duration: 800, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, []);

  const current = LOADING_MESSAGES[index];

  return (
    <View style={styles.card}>
      {/* Bouncing Character */}
      <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
        <Text style={styles.emojiLarge}>{current.emoji}</Text>
      </Animated.View>

      {/* Message */}
      <Text style={styles.messageText}>{current.text}</Text>

      {/* Simple Progress Dots */}
      <View style={styles.dotContainer}>
        {LOADING_MESSAGES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <Text style={styles.subText}>Your amazing story is coming to life! 🌈</Text>
    </View>
  );
};

// --- MAIN COMPONENT ---
interface Props {
  isVisible: boolean;
}

const StoryGenerationSplash: React.FC<Props> = ({ isVisible }) => {
  const { getError, retryStoryGeneration } = useConversationStore();

  // Check if we have a specific generation error
  const error = getError('story_generation')?.userMessage;

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      {error ? (
        <ErrorView onRetry={retryStoryGeneration} />
      ) : (
        <LoadingView />
      )}
    </View>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject, // Covers entire screen
    backgroundColor: 'transparent', // Let background image show through
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
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
  emojiLarge: {
    fontSize: 80,
    marginBottom: 20,
  },
  messageText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 20,
    minHeight: 60, // Prevents layout jump when text changes
  },
  subText: {
    fontSize: 18,
    color: '#4ECDC4',
    marginTop: 20,
    fontWeight: '600',
  },
  dotContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E5E5E5',
  },
  dotActive: {
    backgroundColor: '#4ECDC4',
    transform: [{ scale: 1.3 }],
  },
  retryButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 16,
    marginTop: 20,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#45B8B0',
  },
  retryText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  }
});

export default StoryGenerationSplash;