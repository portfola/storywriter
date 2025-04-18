import React from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { s } from './BookSpread.style';
import PaperBackground from './PaperBackground';

// Define the props for the component
interface BookSpreadProps {
  // Content for left and right pages
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  
  // Or specific content types
  imageUrl?: string;
  title?: string;
  text?: string;
  
  // Navigation and state
  pageNumber?: number;
  totalPages?: number;
  isLoading?: boolean;
  
  // Callbacks
  onNextPage?: () => void;
  onPrevPage?: () => void;
  
  // Display options
  showCover?: boolean;
  coverTitle?: string;
  coverSubtitle?: string;
  coverImageUrl?: string;
  
  // Story sections for multi-page display
  sections?: Array<{
    text: string;
    imageUrl: string | null;
    pageNumber: number;
  }>;
}

/**
 * BookSpread Component
 * 
 * Displays content in a book-like spread with two pages side by side.
 * Left page typically contains an image, right page contains text.
 * Special case for title page and book cover display.
 */
const BookSpread: React.FC<BookSpreadProps> = ({
  leftContent,
  rightContent,
  imageUrl,
  title,
  text,
  pageNumber = 0,
  totalPages = Infinity,
  isLoading = false,
  onNextPage,
  onPrevPage,
  showCover = false,
  coverTitle,
  coverSubtitle,
  coverImageUrl,
  sections = [],
}) => {
  // If showCover is explicitly set to true, show the cover page
  if (showCover || pageNumber === 0) {
    return (
      <TouchableOpacity 
        style={s.bookCover}
        onPress={onNextPage}
        activeOpacity={0.9}
      >
        <PaperBackground texture="leather">
          {coverImageUrl ? (
            <Image source={{ uri: coverImageUrl }} style={s.coverImage} resizeMode="contain" />
          ) : (
            <ActivityIndicator size="large" color="#8B4513" />
          )}
          <Text style={s.coverTitle}>{coverTitle || title || 'My Story'}</Text>
          <Text style={s.coverSubtitle}>{coverSubtitle || 'Tap to open'}</Text>
        </PaperBackground>
      </TouchableOpacity>
    );
  }
  
  // If still loading content, show loading indicator
  if (isLoading) {
    return (
      <View style={s.bookContainer}>
        <PaperBackground style={s.leftPage} texture="paper">
          <ActivityIndicator size="large" color="#8B4513" />
        </PaperBackground>
        <View style={s.bookSpine} />
        <PaperBackground style={s.rightPage} texture="paper">
          <ActivityIndicator size="large" color="#8B4513" />
        </PaperBackground>
      </View>
    );
  }
  
  // Get the current section data based on pageNumber
  const currentSection = sections && sections.length > 0 && pageNumber > 0 
    ? sections.find(s => s.pageNumber === pageNumber) || null
    : null;
    
  // Determine what to show on left page (image by default)
  const renderLeftPage = () => {
    // If custom left content is provided, use that
    if (leftContent) {
      return leftContent;
    }
    
    // If we have a section with an image, use that
    if (currentSection && currentSection.imageUrl) {
      return <Image source={{ uri: currentSection.imageUrl }} style={s.pageImage} resizeMode="contain" />;
    }
    
    // Otherwise, show image if available
    if (imageUrl) {
      return <Image source={{ uri: imageUrl }} style={s.pageImage} resizeMode="contain" />;
    }
    
    // Fallback to placeholder with message
    return (
      <View style={s.imagePlaceholder}>
        <ActivityIndicator size="large" color="#8B4513" />
        <Text style={s.placeholderText}>Creating illustration...</Text>
      </View>
    );
  };
  
  // Determine what to show on right page (text by default)
  const renderRightPage = () => {
    // If custom right content is provided, use that
    if (rightContent) {
      return rightContent;
    }
    
    // If we have a section with text, use that
    if (currentSection) {
      return (
        <View style={s.textContainer}>
          <Text style={s.storyText}>{currentSection.text}</Text>
          {/* Optional decorative corner fold */}
          <View style={s.pageCorner} />
        </View>
      );
    }
    
    // If we have a title, assume this is the title page
    if (title && pageNumber === 1) {
      return (
        <View style={s.titlePageContainer}>
          <Text style={s.titleText}>{title}</Text>
          {text && <Text style={s.storyText}>{text}</Text>}
        </View>
      );
    }
    
    // Otherwise, just show the text
    return (
      <View style={s.textContainer}>
        <Text style={s.storyText}>{text || ''}</Text>
        {/* Optional decorative corner fold */}
        <View style={s.pageCorner} />
      </View>
    );
  };
  
  // Main book spread render
  return (
    <View style={s.bookContainer}>
      {/* Left page with paper texture */}
      <TouchableOpacity 
        activeOpacity={1}
        onPress={pageNumber > 1 ? onPrevPage : undefined}
        style={{flex: 1}}
      >
        <PaperBackground style={s.leftPage} texture="paper">
          {renderLeftPage()}
        </PaperBackground>
      </TouchableOpacity>
      
      {/* Book spine */}
      <View style={s.bookSpine} />
      
      {/* Right page with paper texture */}
      <TouchableOpacity 
        activeOpacity={1}
        onPress={pageNumber < totalPages ? onNextPage : undefined}
        style={{flex: 1}}
      >
        <PaperBackground style={s.rightPage} texture="paper">
          {renderRightPage()}
        </PaperBackground>
      </TouchableOpacity>
      
      {/* Page number (if applicable) */}
      {pageNumber > 0 && totalPages && (
        <Text style={s.pageNumber}>
          {pageNumber} of {totalPages}
        </Text>
      )}
    </View>
  );
};

export default BookSpread;