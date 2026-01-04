import React from 'react';
import { ImageBackground, StyleSheet } from 'react-native';

type BackgroundImageProps = {
  children: React.ReactNode;
  opacity?: number;
};

/**
 * BackgroundImage Component
 *
 * Displays the StoryWriter Lab background image with adjustable opacity.
 * Used across screens to maintain consistent branding.
 */
const BackgroundImage = ({ children, opacity = 1 }: BackgroundImageProps) => {
  return (
    <ImageBackground
      source={require('@/assets/images/storywriter-background.png')}
      style={styles.background}
      imageStyle={[styles.image, { opacity }]}
      resizeMode="cover"
    >
      {children}
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  image: {
    opacity: 1,
  },
});

export default BackgroundImage;
