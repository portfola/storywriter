// components/BookSpread/PaperBackground.tsx
import React from 'react';
import { View, StyleSheet, ImageBackground } from 'react-native';

interface PaperBackgroundProps {
  children: React.ReactNode;
  style?: object;
  texture?: 'paper' | 'leather' | 'parchment';
}

const PaperBackground: React.FC<PaperBackgroundProps> = ({ 
  children, 
  style, 
  texture = 'paper' 
}) => {
  // Select texture based on prop
  const getTextureSource = () => {
    switch (texture) {
      case 'leather':
        return require('../../assets/textures/leather_cover.png');
      case 'parchment':
        return require('../../assets/textures/parchment.png');
      case 'paper':
      default:
        return require('../../assets/textures/paper_texture.png');
    }
  };

  return (
    <ImageBackground
      source={getTextureSource()}
      style={[styles.background, style]}
      imageStyle={styles.backgroundImage}
    >
      {children}
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    overflow: 'hidden',
  },
  backgroundImage: {
    opacity: 0.15, // Subtle texture
  },
});

export default PaperBackground;