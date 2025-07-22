import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Layout from '../../components/Layout/Layout';
import { useStory } from '@/hooks/useStory';
import ResponseList from '@/components/ResponseList/ResponseList';
import SpeechControls from '@/components/SpeechControls/SpeechControls';
import GenerateButton from '@/components/GenerateButton/GenerateButton';
import StoryContent from '@/components/StoryContent/StoryContent';
import { s } from './StoryScreen.style';
import ElevenLabsWidget from '@/components/ElevenLabsWidget/ElevenLabsWidget';

const StoryScreen = () => {
  const {
    storyState,
    story,
    // startElevenLabsConversation,
    handleConversationComplete,
    generateStoryWithImages,
  } = useStory();

  const {
    question,
    responses,
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
              <View style={{ flex: 1, width: '100%' }}>
              <ElevenLabsWidget onConversationComplete={handleConversationComplete} />
              
              {/* Test button for manual completion */}
              <TouchableOpacity 
                style={[s.button, { marginTop: 10 }]} 
                onPress={() => handleConversationComplete("I want a story about a brave dragon who helps children learn to read")}
              >
                <Text style={s.buttonText}>Skip to Story Generation (Test)</Text>
              </TouchableOpacity>
            </View>
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