// Additional component for the book cover
// components/BookSpread/BookCover.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import PaperBackground from './PaperBackground';

interface BookCoverProps {
  title: string;
  subtitle?: string;
  onOpen: () => void;
  coverImage?: string;
}

const BookCover: React.FC<BookCoverProps> = ({
  title,
  subtitle,
  onOpen,
  coverImage,
}) => {
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onOpen}
      activeOpacity={0.9}
    >
      <PaperBackground style={styles.cover} texture="leather">
        {/* Title at the top */}
        <Text style={styles.title}>{title}</Text>
        
        {/* Cover image centered below title */}
        {coverImage && (
          <Image 
            source={{ uri: coverImage }} 
            style={styles.coverImageStyle} 
            resizeMode="contain"
          />
        )}
        
        {/* Subtitle or tap instruction */}
        <Text style={styles.subtitle}>
          {subtitle || "Tap to open"}
        </Text>
        
        {/* Book binding details */}
        <View style={styles.bindingEdge} />
        <View style={styles.bindingCorner1} />
        <View style={styles.bindingCorner2} />
      </PaperBackground>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '90%',
    height: '80%',
    alignSelf: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  cover: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    borderRadius: 8,
    overflow: 'hidden',
    padding: 20,
  },
  coverImageStyle: {
    width: '80%',
    height: '60%',
    marginVertical: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.6)', // Gold border to match the theme
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 18,
    color: '#FFF',
    textAlign: 'center',
    marginTop: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  bindingEdge: {
    position: 'absolute',
    left: 0,
    width: 15,
    height: '100%',
    backgroundColor: '#6B4226', // Darker brown for binding
    borderRightWidth: 2,
    borderRightColor: '#8B4513',
  },
  bindingCorner1: {
    position: 'absolute',
    top: 10,
    left: 2,
    width: 15,
    height: 15,
    backgroundColor: '#8B5A2B',
    borderRadius: 2,
  },
  bindingCorner2: {
    position: 'absolute',
    bottom: 10,
    left: 2,
    width: 15,
    height: 15,
    backgroundColor: '#8B5A2B',
    borderRadius: 2,
  },
});

export default BookCover;