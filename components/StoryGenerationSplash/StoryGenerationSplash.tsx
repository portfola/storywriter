import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Animated, Easing, Platform } from 'react-native';
import { useConversationStore } from '@/src/stores/conversationStore';

interface StoryGenerationSplashProps {
  isVisible: boolean;
}

const StoryGenerationSplash: React.FC<StoryGenerationSplashProps> = ({
  isVisible
}) => {
  const { getError, retryStoryGeneration } = useConversationStore();
  const error = getError('story_generation')?.userMessage || null;
  const onRetry = retryStoryGeneration;
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [bounceAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));

  // Web compatibility: use native driver only on mobile platforms
  const useNativeDriver = Platform.OS !== 'web';

  const loadingMessages = useMemo(() => [
    {
      text: "Creating your story...",
      emoji: "✨",
      duration: 3000
    },
    {
      text: "Adding magical illustrations...",
      emoji: "🎨",
      duration: 3500
    },
    {
      text: "Almost ready!",
      emoji: "🌟",
      duration: 2000
    }
  ], []);

  const childFriendlyErrorMessages = [
    "Oops! Our story machine needs a quick break. Let's try again! 🔧",
    "The story elves are working extra hard! Please wait a moment... 🧝‍♀️",
    "Our magical story creator is having a tiny hiccup. One more try? ✨",
    "Sometimes even the best storytellers need a moment to think! 📚",
    "Don't worry - your story is still being crafted with extra care! 🎨"
  ];


  // Animate loading messages
  useEffect(() => {
    if (!isVisible || error) return;

    let isMounted = true;

    const animateMessage = () => {
      if (!isMounted) return;

      // Fade out current message
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver,
      }).start((finished) => {
        if (!finished || !isMounted) return;

        // Update message index
        setCurrentMessageIndex((prev) => {
          const next = (prev + 1) % loadingMessages.length;
          return next;
        });

        // Fade in new message
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver,
        }).start();
      });
    };

    const currentMessage = loadingMessages[currentMessageIndex];
    const timer = setTimeout(animateMessage, currentMessage.duration);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [currentMessageIndex, fadeAnim, isVisible, error, loadingMessages, useNativeDriver]);

  // Bounce animation for character
  useEffect(() => {
    if (!isVisible) return;

    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.quad),
          useNativeDriver,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.in(Easing.quad),
          useNativeDriver,
        }),
      ])
    );

    bounceAnimation.start();

    return () => {
      bounceAnimation.stop();
      bounceAnimation.reset();
    };
  }, [bounceAnim, isVisible, useNativeDriver]);

  // Pulse animation for progress indicator
  useEffect(() => {
    if (!isVisible) return;

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver,
        }),
      ])
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
      pulseAnimation.reset();
    };
  }, [pulseAnim, isVisible, useNativeDriver]);

  // Component only shows based on isVisible prop
  if (!isVisible) return null;

  const currentMessage = loadingMessages[currentMessageIndex];
  const randomErrorMessage = childFriendlyErrorMessages[
    Math.floor(Math.random() * childFriendlyErrorMessages.length)
  ];

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorEmoji}>😊</Text>
            <Text style={styles.errorMessage}>{randomErrorMessage}</Text>
            <Animated.View 
              style={[styles.retryButton, { transform: [{ scale: pulseAnim }] }]}
            >
              <Text style={styles.retryButtonText} onPress={onRetry}>
                Try Again! 🚀
              </Text>
            </Animated.View>
          </View>
        ) : (
          <>
            {/* Animated Character */}
            <Animated.View 
              style={[
                styles.characterContainer,
                { 
                  transform: [{ 
                    translateY: bounceAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -20],
                    })
                  }] 
                }
              ]}
            >
              <Text style={styles.characterEmoji}>{currentMessage.emoji}</Text>
              <View style={styles.magicSparkles}>
                <Text style={styles.sparkle}>✨</Text>
                <Text style={styles.sparkle}>⭐</Text>
                <Text style={styles.sparkle}>🌟</Text>
              </View>
            </Animated.View>

            {/* Loading Message */}
            <Animated.View style={[styles.messageContainer, { opacity: fadeAnim }]}>
              <Text style={styles.loadingMessage}>{currentMessage.text}</Text>
            </Animated.View>

            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                {loadingMessages.map((_, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.progressDot,
                      index <= currentMessageIndex && styles.progressDotActive,
                      index === currentMessageIndex && { transform: [{ scale: pulseAnim }] }
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* Encouraging Text */}
            <Text style={styles.encouragingText}>
              Your amazing story is coming to life! 🌈
            </Text>
          </>
        )}
      </View>
    </View>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#f8f9ff',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
  },
  content: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    maxWidth: 300,
  },
  characterContainer: {
    alignItems: 'center' as const,
    marginBottom: 30,
    position: 'relative' as const,
  },
  characterEmoji: {
    fontSize: 80,
    textAlign: 'center' as const,
  },
  magicSparkles: {
    position: 'absolute' as const,
    top: -10,
    left: 0,
    right: 0,
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    zIndex: -1,
  },
  sparkle: {
    fontSize: 20,
    opacity: 0.7,
  },
  messageContainer: {
    marginBottom: 25,
    minHeight: 60,
    justifyContent: 'center' as const,
  },
  loadingMessage: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: '#4a5568',
    textAlign: 'center' as const,
    lineHeight: 28,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressTrack: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 12,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
    borderWidth: 2,
    borderColor: '#cbd5e0',
  },
  progressDotActive: {
    backgroundColor: '#4299e1',
    borderColor: '#3182ce',
  },
  encouragingText: {
    fontSize: 16,
    color: '#6b46c1',
    textAlign: 'center' as const,
    fontWeight: '500' as const,
    marginTop: 10,
  },
  errorContainer: {
    alignItems: 'center' as const,
    paddingVertical: 20,
  },
  errorEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  errorMessage: {
    fontSize: 18,
    color: '#e53e3e',
    textAlign: 'center' as const,
    marginBottom: 25,
    lineHeight: 24,
    fontWeight: '500' as const,
  },
  retryButton: {
    backgroundColor: '#48bb78',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold' as const,
    textAlign: 'center' as const,
  },
};

export default StoryGenerationSplash;