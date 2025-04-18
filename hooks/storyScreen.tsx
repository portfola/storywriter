import React from 'react';
import { View, Text } from 'react-native';
import Layout from '../components/Layout/Layout';
import { useStory } from '@/hooks/useStory';
import ResponseList from '@/components/ResponseList/ResponseList';
import SpeechControls from '@/components/SpeechControls/SpeechControls';
import GenerateButton from '@/components/GenerateButton/GenerateButton';
import BookSpread from '@/components/BookSpread/BookSpread'; // Add this import
import { s } from '../pages/StoryScreen/StoryScreen.style';

const StoryScreen = () => {
  const {
    storyState,
    story,
    startListening,
    handleConversationComplete,
    generateStoryWithImages,
    nextPage,
    previousPage
  } = useStory();

  return (
    <Layout>
      <View style={s.container}>
        {story.content ? (
          // If we have story content, show the book
          <BookSpread
            title={story.title}
            coverImageUrl={story.coverImageUrl || undefined}
            sections={story.sections}
            pageNumber={story.currentPage}
            totalPages={story.sections.length}
            onNextPage={nextPage}
            onPrevPage={previousPage}
          />
        ) : (
          // Otherwise, show the story creation UI
          <>
            <Text style={s.questionText}>{storyState.question}</Text>
            {!storyState.conversationComplete && (
              <SpeechControls
                isListening={storyState.isListening}
                onStart={startListening}
                onStop={handleConversationComplete}
              />
            )}
            {storyState.responses.length > 0 && <ResponseList responses={storyState.responses} />}
            {(storyState.conversationComplete || storyState.responses.length > 0) && (
              <GenerateButton
                isGenerating={storyState.isGenerating}
                onGenerate={generateStoryWithImages}
              />
            )}
          </>
        )}
      </View>
    </Layout>
  );
};

export default StoryScreen;