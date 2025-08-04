import React from 'react';
import { View, Text } from 'react-native';
import Layout from '../../components/Layout/Layout';
import { useConversationStore } from '@/src/stores/conversationStore';
import ResponseList from '@/components/ResponseList/ResponseList';
import GenerateButton from '@/components/GenerateButton/GenerateButton';
import StoryContent from '@/components/StoryContent/StoryContent';
import ConversationInterface from '@/components/ConversationInterface/ConversationInterface';
import { s } from './StoryScreen.style';

const StoryScreen = () => {
  const {
    currentQuestion: question,
    responses,
    isGenerating,
    conversationComplete,
    story,
    handleConversationComplete,
    generateStoryWithImages,
  } = useConversationStore();

  return (
    <Layout>
      <View style={s.container}>
        {!story.content ? (
          <>
            <Text style={s.questionText}>{question}</Text>

            {!conversationComplete && (
              <ConversationInterface 
                onConversationComplete={handleConversationComplete}
                disabled={isGenerating}
              />
            )}

            {responses.length > 0 && <ResponseList responses={responses} />}

            {conversationComplete && (
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