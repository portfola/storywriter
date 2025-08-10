import React from 'react';
import { View, Text } from 'react-native';
import Layout from '../components/Layout/Layout';
import { useConversationStore, ConversationPhase } from '@/src/stores/conversationStore';
import StoryContent from '@/components/StoryContent/StoryContent';
import ConversationInterface from '@/components/ConversationInterface/ConversationInterface';
import StoryGenerationSplash from '@/components/StoryGenerationSplash/StoryGenerationSplash';
import { s } from '../pages/StoryScreen/StoryScreen.style';

const StoryScreen = () => {
  const {
    isGenerating,
    conversationComplete,
    story,
    phase,
    automaticGenerationActive,
    retryStoryGeneration,
    getError
  } = useConversationStore();
  
  // Get story generation error using new error handling
  const storyGenerationError = getError('story_generation');
  
  const currentPhase: ConversationPhase = phase;

  // Show splash screen during story generation
  if (currentPhase === 'STORY_GENERATING' || currentPhase === 'TRANSCRIPT_PROCESSING') {
    return (
      <Layout>
        <StoryGenerationSplash
          isVisible={true}
          error={storyGenerationError?.userMessage || null}
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

            {!conversationComplete && (
              <ConversationInterface 
                disabled={isGenerating}
              />
            )}

            {currentPhase === 'CONVERSATION_ENDED' && (
              <Text style={s.processingText}>
                📝 Processing your conversation...
              </Text>
            )}

            {(currentPhase as ConversationPhase) === 'TRANSCRIPT_PROCESSING' && (
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