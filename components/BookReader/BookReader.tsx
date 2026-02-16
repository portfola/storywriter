import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    Platform,
    ScrollView,
    PanResponder,
    Animated,
    useWindowDimensions,
} from 'react-native';
import { useConversationStore } from '@/src/stores/conversationStore';
import { styles } from './BookReader.style';
import RenderHtml from 'react-native-render-html';

const BookReader = () => {
    const { story, resetConversation } = useConversationStore();
    const { width } = useWindowDimensions();

    // story.pages is an array of HTML strings, one per page
    const pages = story.pages.length > 0
        ? story.pages
        : ['<p>Loading story...</p>'];

    const [currentIndex, setCurrentIndex] = useState(0);
    const [showEndMenu, setShowEndMenu] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const isLastPage = currentIndex === pages.length - 1;

    // --- NAVIGATION ---
    const goNext = () => {
        if (currentIndex < pages.length - 1) setCurrentIndex(prev => prev + 1);
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

    const handleNewStory = () => resetConversation();
    const handleExit = () => resetConversation();

    // --- FADE IN END MENU ON LAST PAGE ---
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

    // --- KEYBOARD (web only) ---
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

    // --- SWIPE ---
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20,
            onPanResponderRelease: (_, g) => {
                if (g.dx < -50) goNext();
                else if (g.dx > 50) goPrev();
            },
        })
    ).current;

    const currentPageHtml = pages[currentIndex] ?? '<p></p>';

    // Build the full HTML for this page, injecting title and cover on page 1
    const firstPageExtras = currentIndex === 0
        ? `${story.title ?? ''}${story.coverImage ? `<img src="${story.coverImage}" style="width:100%;border-radius:8px;margin-bottom:16px;" />` : ''}`
        : '';

    const htmlToRender = `${firstPageExtras}${currentPageHtml}`;

    return (
        <View style={styles.container} {...panResponder.panHandlers}>
            <View style={styles.pageWrapper}>

                <Text style={styles.pageNumber}>
                    Page {currentIndex + 1} of {pages.length}
                </Text>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <RenderHtml
                        contentWidth={width - 80}
                        source={{ html: htmlToRender }}
                    />
                </ScrollView>
            </View>

            {/* END OF STORY MENU */}
            {showEndMenu && isLastPage && (
                <Animated.View style={[styles.endMenuOverlay, { opacity: fadeAnim }]}>
                    <View style={styles.endMenuContainer}>
                        <Text style={styles.endTitle}>The End! 🎉</Text>
                        <Text style={styles.endSubtitle}>What would you like to do?</Text>

                        <TouchableOpacity style={[styles.endButton, styles.primaryButton]} onPress={handleNewStory}>
                            <Text style={styles.primaryButtonText}>✨ Create New Story</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.endButton, styles.secondaryButton]} onPress={handleRestartStory}>
                            <Text style={styles.secondaryButtonText}>🔄 Read Again</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.endButton, styles.tertiaryButton]} onPress={handleExit}>
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
                            <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
                        ))}
                    </View>

                    <TouchableOpacity
                        onPress={goNext}
                        style={[styles.navButton, isLastPage && styles.disabledBtn]}
                        disabled={isLastPage}
                    >
                        <Text style={styles.navArrow}>›</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

export default BookReader;