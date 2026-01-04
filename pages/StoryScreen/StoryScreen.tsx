import React, { useRef } from 'react';
import { View } from 'react-native';
import Layout from '../../components/Layout/Layout';
import { useConversationStore, ConversationPhase } from '@/src/stores/conversationStore';
import StoryContent from '@/components/StoryContent/StoryContent';
import ConversationInterface, { ConversationInterfaceRef } from '@/components/ConversationInterface/ConversationInterface';
import StoryGenerationSplash from '@/components/StoryGenerationSplash/StoryGenerationSplash';
import ErrorBoundary from '@/components/ErrorBoundary/ErrorBoundary';
import BackgroundImage from '@/components/BackgroundImage/BackgroundImage';
import WelcomeOverlay from '@/components/WelcomeOverlay/WelcomeOverlay';
import { s } from './StoryScreen.style';

const StoryScreen = () => {
  const {
    story,
    phase,
    isGenerating
  } = useConversationStore();

  const conversationRef = useRef<ConversationInterfaceRef>(null);
  const currentPhase: ConversationPhase = phase;

  // Determine if we should show the background
  const showBackground = (currentPhase === 'IDLE' || currentPhase === 'ACTIVE') && !story.content;

  // Show welcome overlay when IDLE and user hasn't started the conversation yet
  const showWelcome = currentPhase === 'IDLE' && !story.content;

  const handleStart = () => {
    // Start the conversation when the welcome button is clicked
    conversationRef.current?.startConversation();
  };

  // Show splash screen during story generation
  if (currentPhase === 'GENERATING') {
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

  // Show story content (without background)
  if (story.content) {
    return (
      <Layout>
        <View style={s.container}>
          <StoryContent />
        </View>
      </Layout>
    );
  }

  // Show conversation interface with background
  return (
    <Layout>
      <BackgroundImage opacity={showBackground ? 0.6 : 0}>
        <View style={s.container}>
          {(currentPhase === 'IDLE' || currentPhase === 'ACTIVE') && (
            <ConversationInterface
              ref={conversationRef}
              disabled={isGenerating}
              hideButtons={true}
            />
          )}

          <WelcomeOverlay
            visible={showWelcome}
            onStart={handleStart}
          />
        </View>
      </BackgroundImage>
    </Layout>
  );
};

export default StoryScreen;