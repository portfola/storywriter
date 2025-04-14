// BookSpread.style.ts (updated to work with PaperBackground)
import { StyleSheet, Dimensions } from 'react-native';

// Get screen dimensions for responsive sizing
const { width, height } = Dimensions.get('window');

// Book dimensions - adjust as needed for your app
const BOOK_HEIGHT = height * 0.8;  // 80% of screen height
const BOOK_WIDTH = width * 0.9;    // 90% of screen width
const PAGE_WIDTH = BOOK_WIDTH / 2; // Each page is half the book width

export const s = StyleSheet.create({
  // Main container for the entire book
  bookContainer: {
    width: BOOK_WIDTH,
    height: BOOK_HEIGHT,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: 4,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    alignSelf: 'center',
  },
  
  // The book spine in the center
  bookSpine: {
    width: 15,
    height: BOOK_HEIGHT,
    backgroundColor: '#8B4513', // Brown color for spine
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#5D3217',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Left page styling - modified to work with PaperBackground
  leftPage: {
    width: PAGE_WIDTH - 7.5, // Accounting for spine
    height: BOOK_HEIGHT,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    // Remove backgroundColor as it will be provided by PaperBackground
  },
  
  // Right page styling - modified to work with PaperBackground
  rightPage: {
    width: PAGE_WIDTH - 7.5, // Accounting for spine
    height: BOOK_HEIGHT,
    padding: 20,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    // Remove backgroundColor as it will be provided by PaperBackground
  },
  
  // Image styling for left page
  pageImage: {
    width: PAGE_WIDTH - 40, // Accounting for padding
    height: BOOK_HEIGHT - 100,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D2B48C', // Tan border for image frame effect
  },
  
  // Text container for right page
  textContainer: {
    flex: 1,
    padding: 10,
  },

  // Title page specific styling
  titlePageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Title text
  titleText: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#5D3217', // Dark brown
    marginBottom: 20,
  },
  
  // Story text styling
  storyText: {
    fontSize: 18,
    lineHeight: 24,
    color: '#333',
    fontFamily: 'serif', // More book-like font
  },
  
  // Page number styling
  pageNumber: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    fontSize: 14,
    color: '#8B4513', // Brown color to match book theme
  },
  
  // Page corner fold effect (optional)
  pageCorner: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    backgroundColor: 'transparent',
    borderTopWidth: 30,
    borderRightWidth: 30,
    borderTopColor: 'transparent',
    borderRightColor: '#E5DCC3', // Slightly darker than page color
  },
  
  // Image placeholder if image is not loaded yet
  imagePlaceholder: {
    width: PAGE_WIDTH - 40,
    height: BOOK_HEIGHT - 100,
    backgroundColor: '#E5DCC3',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D2B48C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Book cover for when the book is first displayed
  // Modified to work with PaperBackground
  bookCover: {
    width: BOOK_WIDTH,
    height: BOOK_HEIGHT,
    borderRadius: 4,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    // Remove backgroundColor as it will be provided by PaperBackground
  },
  
  // Cover title styling
  coverTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  // Cover subtitle/author styling
  coverSubtitle: {
    fontSize: 18,
    color: '#FFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});