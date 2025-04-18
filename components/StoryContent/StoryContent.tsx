import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { s } from '../../pages/StoryScreen/StoryScreen.style';
import AnimatedBook from '../BookSpread/AnimatedBook';

interface Props {
  isGenerating: boolean;
  sections: { text: string; imageUrl: string | null; title?: string }[];
}

/**
 * StoryContent Component
 *
 * Displays the generated story text and image as an interactive book with images and text.
 * Uses the BookSpread component to create a realistic book experience.
 * Replaces input UI once the story is ready.
 *
 * @param {boolean} isGenerating - Whether content is still being generated.
 * @param {{ text: string; imageUrl: string | null; title?: string }[]} sections - Generated story sections.
 *
 * @returns Book-like interface for story display.
 */
const StoryContent: React.FC<Props> = ({ isGenerating, sections }) => {
  const [showCover, setShowCover] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  
  if (isGenerating) {
    return (
      <View style={s.container}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }
  
  if (!sections || sections.length === 0) {
    return (
      <AnimatedBook
        showCover={true}
        coverTitle="Loading Story..."
        coverSubtitle="Please wait..."
        isLoading={true}
      />
    );
  }
  
  // Handle page navigation
  const goToNextPage = () => {
    if (showCover) {
      setShowCover(false);
      return;
    }
    
    if (currentPage < sections.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    } else if (!showCover) {
      setShowCover(true);
    }
  };
  
  // Extract story title (use first section's title or default)
  const storyTitle = sections[0]?.title || "My Story";
  
  // If showing cover
  if (showCover) {
    return (
      <AnimatedBook
        isFirstView={true}
        coverTitle={storyTitle}
        coverSubtitle="Tap to open"
        imageUrl={sections[0]?.imageUrl || undefined}
        onOpenBook={goToNextPage}
      />
    );
  }
  
  // Show book spread with current page content
  const section = sections[currentPage];
  return (
    <AnimatedBook
      imageUrl={section.imageUrl || undefined}
      title={currentPage === 0 ? storyTitle : undefined}
      text={section.text || ""}
      pageNumber={currentPage + 1}
      totalPages={sections.length}
      onNextPage={goToNextPage}
      onPrevPage={goToPrevPage}
    />
  );
};

export default StoryContent;