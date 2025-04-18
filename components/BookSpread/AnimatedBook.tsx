// components/BookSpread/AnimatedBook.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import BookSpread from './BookSpread';
import BookCover from './BookCover';
import { Platform } from 'react-native';

// Extend the original props
interface AnimatedBookProps extends React.ComponentProps<typeof BookSpread> {
  isFirstView?: boolean;
  onOpenBook?: () => void;
}

const AnimatedBook: React.FC<AnimatedBookProps> = (props) => {
  const { isFirstView, onOpenBook, ...bookProps } = props;
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  // Run animation when component mounts
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: Platform.OS !== 'web', // Only use native driver on non-web platforms
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: Platform.OS !== 'web', // Only use native driver on non-web platforms
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);
  
  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      {isFirstView ? (
        <BookCover
          title={props.coverTitle || 'My Story'}
          subtitle={props.coverSubtitle}
          onOpen={onOpenBook || (() => {})}
          coverImage={props.imageUrl}
        />
      ) : (
        <BookSpread {...bookProps} />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AnimatedBook;