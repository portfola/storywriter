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
  pageNumber,
  totalPages = Infinity,
  isLoading = false,
  onNextPage,
  onPrevPage,
  showCover = false,
  coverTitle,
  coverSubtitle,
}) => {
  // If we're showing the cover, render a special cover view
  if (showCover) {
    return (
      <TouchableOpacity 
        style={s.bookCover}
        onPress={onNextPage} // Clicking the cover opens the book
        activeOpacity={0.9}
      >
        <PaperBackground texture="leather">
          <Text style={s.coverTitle}>{coverTitle || 'My Story'}</Text>
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
  
  // Determine what to show on left page (image by default)
  const renderLeftPage = () => {
    // If custom left content is provided, use that
    if (leftContent) {
      return leftContent;
    }
    
    // Otherwise, show image if available
    if (imageUrl) {
      return <Image source={{ uri: imageUrl }} style={s.pageImage} resizeMode="contain" />;
    }
    
    // Fallback to placeholder
    return (
      <View style={s.imagePlaceholder}>
        <ActivityIndicator size="small" color="#8B4513" />
      </View>
    );
  };
  
  // Determine what to show on right page (text by default)
  const renderRightPage = () => {
    // If custom right content is provided, use that
    if (rightContent) {
      return rightContent;
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
        onPress={pageNumber && pageNumber > 1 ? onPrevPage : undefined}
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
        onPress={pageNumber && pageNumber < totalPages ? onNextPage : undefined}
        style={{flex: 1}}
      >
        <PaperBackground style={s.rightPage} texture="paper">
          {renderRightPage()}
        </PaperBackground>
      </TouchableOpacity>
      
      {/* Page number (if applicable) */}
      {pageNumber && totalPages && (
        <Text style={s.pageNumber}>
          {pageNumber} of {totalPages}
        </Text>
      )}
    </View>
  );
};

export default BookSpread;