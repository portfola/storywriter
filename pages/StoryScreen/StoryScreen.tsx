import React, { useState } from 'react';
import { View } from 'react-native';
import Layout from '../../components/Layout/Layout';
import { useConversationStore, ConversationPhase } from '@/src/stores/conversationStore';
import StoryContent from '@/components/StoryContent/StoryContent';
import ConversationInterface from '@/components/ConversationInterface/ConversationInterface';
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

  const [hasStarted, setHasStarted] = useState(false);
  const currentPhase: ConversationPhase = phase;

  // Show welcome overlay when IDLE and user hasn't started yet
  const showWelcome = currentPhase === 'IDLE' && !hasStarted && !story.content;

  const handleStart = () => {
    setHasStarted(true);
  };

  // Show story content (without background) - only remove background when showing the actual story
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
  // Background stays visible until story content is ready
  return (
    <Layout>
      <BackgroundImage opacity={0.6}>
        <View style={s.container}>
          {currentPhase === 'GENERATING' ? (
            <ErrorBoundary>
              <StoryGenerationSplash isVisible={true} />
            </ErrorBoundary>
          ) : (
            <>
              {(currentPhase === 'IDLE' || currentPhase === 'ACTIVE') && (
                <ConversationInterface disabled={isGenerating} />
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