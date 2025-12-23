import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Platform,
    ScrollView
} from 'react-native';
import { useConversationStore } from '@/src/stores/conversationStore';

const THEME = {
    paper: '#FAF9F6',
    text: '#2D2D2D',
    accent: '#D35400',
};

const BookReader = () => {
    const { story } = useConversationStore();

    // Safety check: ensure we have pages
    const pages = story.sections && story.sections.length > 0
        ? story.sections
        : [{ text: "Loading story...", imageUrl: null }];

    const [currentIndex, setCurrentIndex] = useState(0);

    // 1. KEYBOARD NAVIGATION
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

    // 2. NAVIGATION ACTIONS
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

    const currentPage = pages[currentIndex];

    return (
        <View style={styles.container}>

            {/* --- THE PAGE CONTENT --- */}
            <View style={styles.pageWrapper}>

                {/* Page Header */}
                <Text style={styles.pageNumber}>
                    Page {currentIndex + 1} of {pages.length}
                </Text>

                {/* Scrollable Content Area (In case text is long) */}
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Illustration */}
                    {currentPage.imageUrl && (
                        <Image
                            source={{ uri: currentPage.imageUrl }}
                            style={styles.illustration}
                            resizeMode="cover"
                        />
                    )}

                    {/* Text */}
                    <Text style={styles.storyText}>
                        {currentPage.text || currentPage.content}
                    </Text>
                </ScrollView>
            </View>

            {/* --- FLOATING CONTROLS --- */}
            <View style={styles.controlsOverlay}>

                {/* LEFT BUTTON */}
                <TouchableOpacity
                    onPress={goPrev}
                    style={[styles.navButton, currentIndex === 0 && styles.disabledBtn]}
                    disabled={currentIndex === 0}
                >
                    <Text style={styles.navArrow}>‹</Text>
                </TouchableOpacity>

                {/* DOTS */}
                <View style={styles.dotsContainer}>
                    {pages.map((_, i) => (
                        <View
                            key={i}
                            style={[styles.dot, i === currentIndex && styles.dotActive]}
                        />
                    ))}
                </View>

                {/* RIGHT BUTTON */}
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
        maxWidth: 800, // Limit width for readability on Desktop
        height: '100%',
        paddingBottom: 80, // Make room for bottom buttons
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
        height: 300, // Fixed height for image
        borderRadius: 8,
        marginBottom: 20,
        backgroundColor: '#eee', // Placeholder color while loading
    },
    storyText: {
        fontSize: 22,
        lineHeight: 34,
        color: THEME.text,
        fontFamily: Platform.OS === 'web' ? 'Georgia, serif' : 'serif',
        textAlign: 'left',
        width: '100%',
    },

    // CONTROLS
    controlsOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        backgroundColor: 'rgba(250, 249, 246, 0.9)', // Semi-transparent background
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        zIndex: 9999, // FORCE ON TOP
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
        cursor: 'pointer', // Web cursor pointer
    },
    disabledBtn: {
        opacity: 0.3,
        backgroundColor: '#f5f5f5',
    },
    navArrow: {
        fontSize: 32,
        color: THEME.accent,
        marginTop: -4, // Visual centering
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