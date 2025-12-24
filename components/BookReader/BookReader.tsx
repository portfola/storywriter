import React, { useState, useEffect, useRef } from 'react'; // <--- Added useRef
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Platform,
    ScrollView,
    PanResponder // <--- Added PanResponder
} from 'react-native';
import { useConversationStore } from '@/src/stores/conversationStore';

const THEME = {
    paper: '#FAF9F6',
    text: '#2D2D2D',
    accent: '#D35400',
};

const BookReader = () => {
    const { story } = useConversationStore();

    const pages = story.sections && story.sections.length > 0
        ? story.sections
        : [{ text: "Loading story...", imageUrl: null }];

    const [currentIndex, setCurrentIndex] = useState(0);

    // --- ACTIONS ---
    const goNext = () => {
        if (currentIndex < pages.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const goPrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    // --- 1. SWIPE DETECTOR (PanResponder) ---
    const panResponder = useRef(
        PanResponder.create({
            // Only active if the user moves their finger horizontally > 20 pixels
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > 20;
            },
            onPanResponderRelease: (_, gestureState) => {
                // If swiped LEFT (dragged finger left) -> Go Next
                if (gestureState.dx < -50) {
                    goNext();
                }
                // If swiped RIGHT (dragged finger right) -> Go Prev
                else if (gestureState.dx > 50) {
                    goPrev();
                }
            }
        })
    ).current;

    // --- 2. KEYBOARD SUPPORT (Web) ---
    useEffect(() => {
        if (Platform.OS === 'web') {
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'ArrowRight') goNext();
                if (e.key === 'ArrowLeft') goPrev();
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [currentIndex, pages.length]);

    const currentPage = pages[currentIndex];

    return (
        // --- 3. ATTACH GESTURE HANDLERS TO CONTAINER ---
        <View style={styles.container} {...panResponder.panHandlers}>

            <View style={styles.pageWrapper}>
                <Text style={styles.pageNumber}>
                    Page {currentIndex + 1} of {pages.length}
                </Text>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    // Important: On web, we want the mouse interaction to still work for scrolling
                    scrollEnabled={true}
                >
                    {currentPage.imageUrl && (
                        <Image
                            source={{ uri: currentPage.imageUrl }}
                            style={styles.illustration}
                            resizeMode="cover"
                        />
                    )}

                    <Text style={styles.storyText}>
                        {currentPage.text || currentPage.content}
                    </Text>
                </ScrollView>
            </View>

            <View style={styles.controlsOverlay}>
                <TouchableOpacity
                    onPress={goPrev}
                    style={[styles.navButton, currentIndex === 0 && styles.disabledBtn]}
                    disabled={currentIndex === 0}
                >
                    <Text style={styles.navArrow}>‹</Text>
                </TouchableOpacity>

                <View style={styles.dotsContainer}>
                    {pages.map((_, i) => (
                        <View
                            key={i}
                            style={[styles.dot, i === currentIndex && styles.dotActive]}
                        />
                    ))}
                </View>

                <TouchableOpacity
                    onPress={goNext}
                    style={[styles.navButton, currentIndex === pages.length - 1 && styles.disabledBtn]}
                    disabled={currentIndex === pages.length - 1}
                >
                    <Text style={styles.navArrow}>›</Text>
                </TouchableOpacity>
            </View>

        </View>
    );
};

const styles = StyleSheet.create({
    // ... (Keep your existing styles exactly the same) ...
    container: {
        flex: 1,
        backgroundColor: THEME.paper,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
    },
    pageWrapper: {
        width: '100%',
        maxWidth: 800,
        height: '100%',
        paddingBottom: 100, // <--- INCREASE THIS (Make room for the taller footer)
        paddingTop: 20,
        paddingHorizontal: 20,
    },
    scrollContent: {
        flexGrow: 1,
        alignItems: 'center',
        paddingBottom: 40,
    },
    pageNumber: {
        textAlign: 'center',
        color: '#999',
        fontSize: 12,
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    illustration: {
        width: '100%',
        height: 300,
        borderRadius: 8,
        marginBottom: 20,
        backgroundColor: '#eee',
    },
    storyText: {
        fontSize: 22,
        lineHeight: 34,
        color: THEME.text,
        fontFamily: Platform.OS === 'web' ? 'Georgia, serif' : 'serif',
        textAlign: 'left',
        width: '100%',
    },
    controlsOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 90, // Increased height slightly
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        backgroundColor: 'rgba(250, 249, 246, 0.95)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        zIndex: 9999,
        // iOS FIX: Add padding at the bottom to push buttons up above the address bar
        paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    },
    navButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#eee',
        cursor: 'pointer',
    },
    disabledBtn: {
        opacity: 0.3,
        backgroundColor: '#f5f5f5',
    },
    navArrow: {
        fontSize: 32,
        color: THEME.accent,
        marginTop: -4,
        fontWeight: '300',
    },
    dotsContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ddd',
    },
    dotActive: {
        backgroundColor: THEME.accent,
        width: 12,
    }
});

export default BookReader;