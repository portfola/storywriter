import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

// Define the props interface for type safety
interface VoiceWaveProps {
  isListening: boolean;
  isSpeaking: boolean;
  // We could add customization props here later, like:
  // barCount?: number;
  // activeColor?: string;
  // inactiveColor?: string;
}

const VoiceWave: React.FC<VoiceWaveProps> = ({ isListening, isSpeaking }) => {
  // Animation state is kept local because it's UI-specific and temporary
  const [waveAmplitudes] = useState(
    Array(10).fill(0).map(() => new Animated.Value(10))
  );

  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      if (isListening || isSpeaking) {
        // Animate each bar to a random height when active
        waveAmplitudes.forEach(amplitude => {
          Animated.timing(amplitude, {
            toValue: Math.random() * 40 + 10,
            duration: 100,
            useNativeDriver: false,
          }).start();
        });
      } else {
        // Reset bars to default height when inactive
        waveAmplitudes.forEach(amplitude => {
          Animated.timing(amplitude, {
            toValue: 10,
            duration: 100,
            useNativeDriver: false,
          }).start();
        });
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    // Start the animation loop
    animate();

    // Cleanup function to prevent memory leaks
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isListening, isSpeaking, waveAmplitudes]);

  return (
    <View style={styles.waveContainer}>
      {waveAmplitudes.map((amplitude, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              height: amplitude,
              backgroundColor: isListening ? '#ff6b6b' : (isSpeaking ? '#4ecdc4' : '#dddddd')
            }
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    gap: 4,
  },
  bar: {
    width: 4,
    borderRadius: 2,
  }
});

export default VoiceWave;