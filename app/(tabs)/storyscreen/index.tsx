import React from 'react';
import { View, Text } from 'react-native';
import Layout from '../../../components/Layout/Layout';
import { useConversationStore } from '@/src/stores/conversationStore';
import ResponseList from '@/components/ResponseList/ResponseList';
import StoryContent from '@/components/StoryContent/StoryContent';
import ConversationInterface from '@/components/ConversationInterface/ConversationInterface';
import StoryGenerationSplash from '@/components/StoryGenerationSplash/StoryGenerationSplash';
import { s } from '../../../pages/StoryScreen/StoryScreen.style';

const StoryScreen = () => {
  const {
    currentQuestion: question,
    responses,
    isGenerating,
    conversationComplete,
    story,
    handleConversationComplete,
    phase,
    storyGenerationError,
    automaticGenerationActive,
    retryStoryGeneration,
  } = useConversationStore();

  // Show splash screen during story generation
  if (phase === 'STORY_GENERATING' && (isGenerating || automaticGenerationActive)) {
    return (
      <Layout>
        <StoryGenerationSplash
          isVisible={true}
          error={storyGenerationError}
          onRetry={retryStoryGeneration}
        />
      </Layout>
    );
  }

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

            {/* Removed manual GenerateButton - story generation is now automatic */}
            {phase === 'CONVERSATION_ENDED' && (
              <Text style={s.processingText}>
                📝 Processing your conversation...
              </Text>
            )}

            {phase === 'TRANSCRIPT_PROCESSING' && (
              <Text style={s.processingText}>
                🔄 Preparing your story...
              </Text>
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