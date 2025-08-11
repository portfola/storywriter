import React from 'react';
import { ScrollView, Image, Text, ActivityIndicator } from 'react-native';
import { useConversationStore } from '@/src/stores/conversationStore';
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
  <ScrollView style={s.storyContainer}>
    {isGenerating ? (
      <ActivityIndicator size="large" color="#3498db" />
    ) : (
      <>
        {sections.length > 0 ? (
          sections.map((section, index) => (
            <React.Fragment key={index}>
              {section.imageUrl && (
                <Image source={{ uri: section.imageUrl }} style={s.storyImage} resizeMode="cover" />
              )}
              <Text style={s.storyText}>{section.text}</Text>
            </React.Fragment>
          ))
        ) : (
          <Text style={s.storyText}>Loading story...</Text>
        )}
      </>
    )}
  </ScrollView>
  );
};

export default StoryContent;