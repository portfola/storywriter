import React from 'react';
import { View, Text, Image, ScrollView, Button, StyleSheet } from 'react-native';

interface StoryPage {
  textContent: string;
  imageUrl: string;
}

interface StoryDisplayProps {
  storyPages: StoryPage[];
  currentPageIndex: number;
  onPageChange: (index: number) => void;
}

const StoryDisplay: React.FC<StoryDisplayProps> = ({ storyPages, currentPageIndex, onPageChange }) => {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{`Page ${currentPageIndex + 1} of ${storyPages.length}`}</Text>
      <View style={styles.pageContent}>
        <Image 
          source={{ uri: storyPages[currentPageIndex]?.imageUrl }} 
          style={styles.image} 
        />
        <Text style={styles.text}>{storyPages[currentPageIndex]?.textContent}</Text>
      </View>
      <View style={styles.navigation}>
        <Button 
          title="Previous" 
          onPress={() => onPageChange(currentPageIndex - 1)}
          disabled={currentPageIndex === 0}
        />
        <Button 
          title="Next" 
          onPress={() => onPageChange(currentPageIndex + 1)}
          disabled={currentPageIndex === storyPages.length - 1}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  pageContent: {
    marginBottom: 20,
  },
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export default StoryDisplay;