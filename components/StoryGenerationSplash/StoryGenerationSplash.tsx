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
    <View style={styles.centerContent}>
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
    <View style={styles.centerContent}>
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
    backgroundColor: '#f8f9ff',
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    alignItems: 'center',
    padding: 20,
    maxWidth: 320,
  },
  emojiLarge: {
    fontSize: 80,
    marginBottom: 20,
  },
  messageText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#4a5568',
    textAlign: 'center',
    marginBottom: 20,
    minHeight: 60, // Prevents layout jump when text changes
  },
  subText: {
    fontSize: 16,
    color: '#6b46c1',
    marginTop: 20,
    fontWeight: '500',
  },
  dotContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#cbd5e0',
  },
  dotActive: {
    backgroundColor: '#4299e1',
    transform: [{ scale: 1.2 }],
  },
  retryButton: {
    backgroundColor: '#48bb78',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 20,
    elevation: 5,
  },
  retryText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  }
});

export default StoryGenerationSplash;