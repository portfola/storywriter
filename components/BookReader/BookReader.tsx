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
    Animated,
    useWindowDimensions
} from 'react-native';
import { useConversationStore } from '@/src/stores/conversationStore';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './BookReader.style';
import Markdown from 'react-native-markdown-display';
import RenderHtml from 'react-native-render-html';


const BookReader = () => {
    const { story, resetConversation } = useConversationStore(); // Add resetConversation

    const pages = story.sections && story.sections.length > 0
        ? story.sections
        : [{ text: "Loading story...", imageUrl: null }];

    const [currentIndex, setCurrentIndex] = useState(0);
    const [showEndMenu, setShowEndMenu] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const isLastPage = currentIndex === pages.length - 1;

    const { width } = useWindowDimensions();

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

    // Check if content is HTML or plain text
    const isHtmlContent = currentPage.text.includes('<');

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

                    {/* <Text style={styles.storyText}>
                        {currentPage.text || currentPage.text}
                    </Text> */}

                    {/* Page Text - Render as HTML or plain text */}
                    {isHtmlContent ? (
                        <RenderHtml
                            contentWidth={width - 80}
                            source={{ html: currentPage.text }}
                        />
                    ) : (
                        <Text>{currentPage.text}</Text>
                    )}
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

export default BookReader; 