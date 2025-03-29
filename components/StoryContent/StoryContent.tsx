import React from 'react';
import { ScrollView, Image, Text, ActivityIndicator } from 'react-native';
import { s } from '../../pages/StoryScreen/StoryScreen.style';

interface Props {
  isGenerating: boolean;
  sections: { text: string; imageUrl: string | null }[];
}

/**
 * StoryContent Component
 *
 * Displays the generated story text and image.
 * Replaces input UI once the story is ready.
 *
 * @param {boolean} isGenerating - Whether content is still being generated.
 * @param {{ text: string; imageUrl: string | null }[]} sections - Generated story sections.
 *
 * @returns Scrollable story content view.
 */
const StoryContent: React.FC<Props> = ({ isGenerating, sections }) => (
  <ScrollView style={s.storyContainer}>
    {isGenerating ? (
      <ActivityIndicator size="large" color="#3498db" />
    ) : (
      <>
        {sections.length > 0 && sections[0].imageUrl ? (
          <>
            <Image source={{ uri: sections[0].imageUrl }} style={s.storyImage} resizeMode="contain" />
            <Text style={s.storyText}>{sections[0].text}</Text>
          </>
        ) : (
          <Text style={s.storyText}>Loading story...</Text>
        )}
      </>
    )}
  </ScrollView>
);

export default StoryContent;