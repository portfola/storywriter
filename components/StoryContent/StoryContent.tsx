import React from 'react';
import { ScrollView, Image, Text, ActivityIndicator } from 'react-native';
import { useConversationStore } from '@/src/stores/conversationStore';
import BookReader from '@/components/BookReader/BookReader';
import { s } from '../../pages/StoryScreen/StoryScreen.style';

/**
 * StoryContent Component
 *
 * Displays the generated story text and image.
 * Replaces input UI once the story is ready.
 *
 * @returns Scrollable story content view.
 */
const StoryContent: React.FC = () => {
  const { isGenerating, story } = useConversationStore();
  const sections = story.sections;

  return (
    <BookReader></BookReader>
  );
};

export default StoryContent;