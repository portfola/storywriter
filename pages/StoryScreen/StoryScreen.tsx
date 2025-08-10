import React from 'react';
import { View, Text } from 'react-native';
import Layout from '../../components/Layout/Layout';
import { useConversationStore, ConversationPhase } from '@/src/stores/conversationStore';
import StoryContent from '@/components/StoryContent/StoryContent';
import ConversationInterface from '@/components/ConversationInterface/ConversationInterface';
import StoryGenerationSplash from '@/components/StoryGenerationSplash/StoryGenerationSplash';
import ErrorBoundary from '@/components/ErrorBoundary/ErrorBoundary';
import { s } from './StoryScreen.style';

const StoryScreen = () => {
  const {
    isGenerating,
    conversationComplete,
    story,
    handleConversationComplete,
    phase,
    storyGenerationError,
    automaticGenerationActive,
    retryStoryGeneration,
  } = useConversationStore();
  
  const currentPhase: ConversationPhase = phase;

  // Show splash screen during story generation
  if (currentPhase === 'STORY_GENERATING' || currentPhase === 'TRANSCRIPT_PROCESSING') {
    return (
      <Layout>
        <ErrorBoundary>
          <StoryGenerationSplash
            isVisible={true}
            error={storyGenerationError}
            onRetry={retryStoryGeneration}
          />
        </ErrorBoundary>
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
                onConversationComplete={handleConversationComplete}
                disabled={isGenerating}
              />
            )}


            {/* Removed manual GenerateButton - story generation is now automatic */}
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