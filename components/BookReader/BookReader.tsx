import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Platform,
    ScrollView,
    PanResponder,
    Animated
} from 'react-native';
import { useConversationStore } from '@/src/stores/conversationStore';

const THEME = {
    paper: '#FAF9F6',
    text: '#2D2D2D',
    accent: '#D35400',
};

const BookReader = () => {
    const { story, resetConversation } = useConversationStore(); // Add resetConversation

    const pages = story.sections && story.sections.length > 0
        ? story.sections
        : [{ text: "Loading story...", imageUrl: null }];

    const [currentIndex, setCurrentIndex] = useState(0);
    const [showEndMenu, setShowEndMenu] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const isLastPage = currentIndex === pages.length - 1;

    // --- ACTIONS ---
    const goNext = () => {
        if (currentIndex < pages.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const goPrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setShowEndMenu(false);
        }
    };

    const handleRestartStory = () => {
        setCurrentIndex(0);
        setShowEndMenu(false);
        fadeAnim.setValue(0);
    };

    const handleNewStory = () => {
        // Reset the entire conversation store to start fresh
        resetConversation();
        // This will trigger the app to go back to the voice assistant/story input
    };

    const handleExit = () => {
        // For Expo, you can use expo-app-loading or just reset
        // If you want to truly exit the app (mobile only):
        if (Platform.OS !== 'web') {
            // Option 1: Reset to beginning
            resetConversation();

            // Option 2: Or if you have BackHandler for Android
            // BackHandler.exitApp();
        } else {
            // On web, just reset to beginning
            resetConversation();
        }
    };

    // Trigger fade-in animation when reaching last page
    useEffect(() => {
        if (isLastPage && !showEndMenu) {
            const timer = setTimeout(() => {
                setShowEndMenu(true);
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }).start();
            }, 500);

            return () => clearTimeout(timer);
        }
    }, [isLastPage]);

    // --- SWIPE DETECTOR ---
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > 20;
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dx < -50) {
                    goNext();
                } else if (gestureState.dx > 50) {
                    goPrev();
                }
            }
        })
    ).current;

    // --- KEYBOARD SUPPORT ---
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
        <View style={styles.container} {...panResponder.panHandlers}>
            <View style={styles.pageWrapper}>
                <Text style={styles.pageNumber}>
                    Page {currentIndex + 1} of {pages.length}
                </Text>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={true}
                >
                    {currentPage.imageUrl && (
                        <Image
                            source={{ uri: currentPage.imageUrl }}
                            style={styles.illustration}
                            resizeMode="contain"
                        />
                    )}

                    <Text style={styles.storyText}>
                        {currentPage.text || currentPage.text}
                    </Text>
                </ScrollView>
            </View>

            {/* END OF STORY MENU */}
            {showEndMenu && isLastPage && (
                <Animated.View
                    style={[
                        styles.endMenuOverlay,
                        { opacity: fadeAnim }
                    ]}
                >
                    <View style={styles.endMenuContainer}>
                        <Text style={styles.endTitle}>The End! 🎉</Text>
                        <Text style={styles.endSubtitle}>What would you like to do?</Text>

                        <TouchableOpacity
                            style={[styles.endButton, styles.primaryButton]}
                            onPress={handleNewStory}
                        >
                            <Text style={styles.primaryButtonText}>✨ Create New Story</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.endButton, styles.secondaryButton]}
                            onPress={handleRestartStory}
                        >
                            <Text style={styles.secondaryButtonText}>🔄 Read Again</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.endButton, styles.tertiaryButton]}
                            onPress={handleExit}
                        >
                            <Text style={styles.tertiaryButtonText}>🏠 Exit</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            )}

            {/* NAVIGATION CONTROLS */}
            {!showEndMenu && (
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
            )}
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
        maxWidth: 800,
        height: '100%',
        paddingBottom: 100,
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
        resizeMode: 'contain',
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
        height: 90,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        backgroundColor: 'rgba(250, 249, 246, 0.95)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        zIndex: 9999,
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
    },
    // END MENU STYLES
    endMenuOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(250, 249, 246, 0.98)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000,
    },
    endMenuContainer: {
        width: '90%',
        maxWidth: 400,
        padding: 30,
        alignItems: 'center',
    },
    endTitle: {
        fontSize: 36,
        fontWeight: 'bold',
        color: THEME.text,
        marginBottom: 10,
        textAlign: 'center',
    },
    endSubtitle: {
        fontSize: 18,
        color: '#666',
        marginBottom: 40,
        textAlign: 'center',
    },
    endButton: {
        width: '100%',
        padding: 18,
        borderRadius: 12,
        marginBottom: 16,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    primaryButton: {
        backgroundColor: THEME.accent,
    },
    primaryButtonText: {
        fontSize: 20,
        fontWeight: '600',
        color: 'white',
    },
    secondaryButton: {
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: THEME.accent,
    },
    secondaryButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: THEME.accent,
    },
    tertiaryButton: {
        backgroundColor: 'transparent',
    },
    tertiaryButtonText: {
        fontSize: 16,
        color: '#666',
    },
});

export default BookReader;