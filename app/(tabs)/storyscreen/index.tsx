import React from 'react';
import { View, Text } from 'react-native';
import Layout from '../../../components/Layout/Layout';
import { useStory } from '@/hooks/useStory';
import ResponseList from '@/components/ResponseList/ResponseList';
import SpeechControls from '@/components/SpeechControls/SpeechControls';
import GenerateButton from '@/components/GenerateButton/GenerateButton';
import StoryContent from '@/components/StoryContent/StoryContent';
import { s } from './storyscreen.style';


const StoryScreen = () => {
  const {
    storyState,
    story,
    startListening,
    handleConversationComplete,
    generateStoryWithImages,
  } = useStory();

  const {
    question,
    responses,
    isListening,
    isGenerating,
    conversationComplete,
  } = storyState;

  return (
    <Layout>
      <View style={s.container}>
        {!story.content ? (
          <>
            <Text style={s.questionText}>{question}</Text>

            {!conversationComplete && (
              <SpeechControls
                isListening={isListening}
                onStart={startListening}
                onStop={handleConversationComplete}
              />
            )}

            {responses.length > 0 && <ResponseList responses={responses} />}

            {(conversationComplete || responses.length > 0) && (
              <GenerateButton
                isGenerating={isGenerating}
                onGenerate={generateStoryWithImages}
              />
            )}
          </>
        ) : (
          <StoryContent isGenerating={isGenerating} sections={story.sections} />
        )}
      </View>
    </Layout>
  );
};

export default StoryScreen;