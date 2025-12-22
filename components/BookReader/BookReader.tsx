import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Dimensions,
    TouchableOpacity,
    useWindowDimensions,
    Image,
    Platform
} from 'react-native';
import { useConversationStore } from '@/src/stores/conversationStore';

// Kindle-like colors
const THEME = {
    paper: '#FAF9F6', // Off-white "Warm" background
    text: '#2D2D2D',  // Soft black (easier on eyes)
    accent: '#D35400', // Burnt orange for buttons
};

const BookReader = () => {
    const { story } = useConversationStore();

    // Use 'story.sections' if that's what your store populates, 
    // or 'storyPages' depending on your recent refactor.
    // Adapting to the store structure you showed earlier:
    const pages = story.sections && story.sections.length > 0
        ? story.sections
        : [{ text: "No story content available yet.", imageUrl: null }];

    const { width: windowWidth } = useWindowDimensions();
    const flatListRef = useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    // ... inside BookReader component ...

    // Keyboard Support for Web
    useEffect(() => {
        if (Platform.OS === 'web') {
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'ArrowRight') {
                    // We need the latest state, so we check the ref or just let the function handle it
                    if (currentIndex < pages.length - 1) {
                        flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
                    }
                }
                if (e.key === 'ArrowLeft') {
                    if (currentIndex > 0) {
                        flatListRef.current?.scrollToIndex({ index: currentIndex - 1, animated: true });
                    }
                }
            };

            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [currentIndex, pages.length]); // Re-bind when index changes so we have fresh state

    // ... render ...

    // --- NAVIGATION LOGIC ---
    const goNext = () => {
        if (currentIndex < pages.length - 1) {
            flatListRef.current?.scrollToIndex({
                index: currentIndex + 1,
                animated: true,
            });
        }
    };

    const goPrev = () => {
        if (currentIndex > 0) {
            flatListRef.current?.scrollToIndex({
                index: currentIndex - 1,
                animated: true,
            });
        }
    };

    // Sync index when user swipes manually
    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index ?? 0);
        }
    }).current;

    // --- RENDER A SINGLE PAGE ---
    const renderPage = ({ item, index }: { item: any, index: number }) => {
        return (
            <View style={[styles.pageContainer, { width: windowWidth }]}>
                <View style={styles.pageContent}>

                    {/* Header: Page Number */}
                    <Text style={styles.pageNumber}>Page {index + 1} of {pages.length}</Text>

                    {/* Optional Illustration */}
                    {item.imageUrl && (
                        <Image
                            source={{ uri: item.imageUrl }}
                            style={styles.illustration}
                            resizeMode="contain"
                        />
                    )}

                    {/* Story Text */}
                    <View style={styles.textWrapper}>
                        <Text style={styles.storyText}>
                            {item.text}
                        </Text>
                    </View>

                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>

            {/* THE BOOK (Horizontal List) */}
            <FlatList
                ref={flatListRef}
                data={pages}
                renderItem={renderPage}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                keyExtractor={(_, index) => index.toString()}
                style={{ flex: 1 }}
            />

            {/* FOOTER CONTROLS (Floating Overlay) */}
            <View style={styles.controlsOverlay}>

                {/* Previous Button (Hidden on first page) */}
                <TouchableOpacity
                    onPress={goPrev}
                    style={[styles.navButton, { opacity: currentIndex === 0 ? 0 : 1 }]}
                    disabled={currentIndex === 0}
                >
                    <Text style={styles.navText}>‹</Text>
                </TouchableOpacity>

                {/* Progress Dots */}
                <View style={styles.paginationDots}>
                    {pages.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                i === currentIndex && styles.dotActive
                            ]}
                        />
                    ))}
                </View>

                {/* Next Button (Hidden on last page) */}
                <TouchableOpacity
                    onPress={goNext}
                    style={[styles.navButton, { opacity: currentIndex === pages.length - 1 ? 0 : 1 }]}
                    disabled={currentIndex === pages.length - 1}
                >
                    <Text style={styles.navText}>›</Text>
                </TouchableOpacity>
            </View>

        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.paper,
    },
    pageContainer: {
        flex: 1,
        paddingHorizontal: 20,
        justifyContent: 'center', // Centers vertically like a book
        alignItems: 'center',
    },
    pageContent: {
        width: '100%',
        maxWidth: 800, // Reads better on Desktop if we limit width
        backgroundColor: '#FFF', // Make the page pop slightly
        borderRadius: 8,
        padding: 30,
        // Add subtle shadow for "Physical Page" feel
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3, // Android shadow
        minHeight: '60%', // Ensure it looks substantial
    },
    pageNumber: {
        position: 'absolute',
        top: 15,
        right: 20,
        fontSize: 12,
        color: '#999',
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    illustration: {
        width: '100%',
        height: 200,
        marginBottom: 20,
        borderRadius: 4,
    },
    textWrapper: {
        flex: 1,
        justifyContent: 'center',
    },
    storyText: {
        fontSize: 20, // Nice and large for kids/grandparents
        lineHeight: 32,
        color: THEME.text,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', // Serif is key for "Book" feel
        textAlign: 'left',
    },

    // Controls
    controlsOverlay: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    navButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0,0,0,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    navText: {
        fontSize: 30,
        lineHeight: 34, // Fix vertical alignment of arrow
        color: THEME.text,
        paddingBottom: 4, // Visual tweak for arrow character
    },
    paginationDots: {
        flexDirection: 'row',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#DDD',
    },
    dotActive: {
        backgroundColor: THEME.accent,
        width: 12, // Active dot grows slightly
    },
});

export default BookReader;