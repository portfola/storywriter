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
    conversationComplete,
    story,
    phase,
    isGenerating
  } = useConversationStore();
  
  const currentPhase: ConversationPhase = phase;

  // Show splash screen during story generation
  if (currentPhase === 'STORY_GENERATING' || currentPhase === 'TRANSCRIPT_PROCESSING') {
    return (
      <Layout>
        <ErrorBoundary>
          <StoryGenerationSplash
            isVisible={true}
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
          <StoryContent />
        )}
      </View>
    </Layout>
  );
};

export default StoryScreen;