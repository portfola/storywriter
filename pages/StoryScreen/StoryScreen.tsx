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

  // Show welcome overlay when IDLE and user hasn't started the conversation yet
  const showWelcome = currentPhase === 'IDLE' && !story.content;

  const handleStart = () => {
    // Start the conversation when the welcome button is clicked
    conversationRef.current?.startConversation();
  };

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

  // Show all other phases with background (IDLE, ACTIVE, GENERATING)
  return (
    <Layout>
      <BackgroundImage opacity={0.6}>
        <View style={s.container}>
          {currentPhase === 'GENERATING' ? (
            <ErrorBoundary>
              <StoryGenerationSplash
                isVisible={true}
              />
            </ErrorBoundary>
          ) : (
            <>
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
            </>
          )}
        </View>
      </BackgroundImage>
    </Layout>
  );
};

export default StoryScreen;