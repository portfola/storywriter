import React from 'react';
import { View, Text } from 'react-native';
import Layout from '../components/Layout/Layout';
import { useStory } from '@/hooks/useStory';
import ResponseList from '@/components/ResponseList/ResponseList';
import SpeechControls from '@/components/SpeechControls/SpeechControls';
import GenerateButton from '@/components/GenerateButton/GenerateButton';
import StoryContent from '@/components/StoryContent/StoryContent';
import { s } from '../pages/StoryScreen/StoryScreen.style';

const StoryScreen = () => {
  const {
    storyState,
    story,
    startListening,
    handleConversationComplete,
    generateStoryWithImages,
  } = useStory();

  return (
    <Layout>
      <View style={s.container}>
        {!story.content ? (
          <>
            <Text style={s.questionText}>{storyState.question}</Text>
            {!storyState.conversationComplete && (
              <SpeechControls
                isListening={storyState.isListening}
                onStart={startListening}
                onStop={handleConversationComplete}
              />
            )}
            {storyState.responses.length > 0 && <ResponseList responses={storyState.responses} />}
            {(storyState.conversationComplete || storyState.responses.length > 0) && (
              <GenerateButton
                isGenerating={storyState.isGenerating}
                onGenerate={generateStoryWithImages}
              />
            )}
          </>
        ) : (
          <StoryContent isGenerating={storyState.isGenerating} sections={story.sections} />
        )}
      </View>
    </Layout>
  );
};

export default StoryScreen;