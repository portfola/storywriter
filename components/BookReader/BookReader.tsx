import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { StorySection } from '@/types/story';
import { createNarrationPlayer } from '@/services/narration';
import type { NarrationPlayer } from '@/services/narration';
import audioCache from '@/services/narration/audioCache';
import elevenLabsService from '@/services/elevenLabsService';
import { NarrationControls } from '@/components/NarrationControls/NarrationControls';
import { logger, LogCategory } from '@/src/utils/logger';

interface BookReaderProps {
    /** If provided, read these sections instead of pulling from the conversation store. */
    sections?: StorySection[];
    /** If provided, the end-of-story menu switches to "Read Again / Back to Bookshelf" mode. */
    onBack?: () => void;
}

const THEME = {
    paper: '#FAF9F6',
    text: '#2D2D2D',
    accent: '#D35400',
};

const BookReader = ({ sections: sectionsProp, onBack }: BookReaderProps = {}) => {
    const {
        story,
        resetConversation,
        isNarrationEnabled,
        isNarrationPlaying,
        isLoadingAudio,
        autoAdvancePages,
        isRateLimited,
        setNarrationPlaying,
        setLoadingAudio,
        setRateLimited
    } = useConversationStore();

    const pages = (sectionsProp && sectionsProp.length > 0)
        ? sectionsProp
        : (story.sections && story.sections.length > 0
            ? story.sections
            : [{ text: "Loading story...", imageUrl: null }]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [showEndMenu, setShowEndMenu] = useState(false);
    const [audioError, setAudioError] = useState<string | null>(null);
    const [canRetry, setCanRetry] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const isLastPage = currentIndex === pages.length - 1;
    const playerRef = useRef<NarrationPlayer | null>(null);
    const storyIdRef = useRef<string>(`story-${Date.now()}`);

    // --- PLAYBACK HANDLERS ---
    const handlePlaybackComplete = useCallback(() => {
        setNarrationPlaying(false);

        // Auto-advance to next page if enabled
        if (autoAdvancePages && currentIndex < pages.length - 1) {
            setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
            }, 1500);
        }
    }, [autoAdvancePages, currentIndex, pages.length, setNarrationPlaying]);

    // --- AUDIO GENERATION ---
    const generateAndLoadAudio = useCallback(async (pageIndex: number, pageText: string) => {
        if (!isNarrationEnabled || !pageText || pageText === "Loading story..." || isRateLimited) {
            return;
        }

        const cacheKey = `${storyIdRef.current}-${pageIndex}`;

        try {
            setLoadingAudio(true);
            setAudioError(null);
            setCanRetry(false);

            // Check cache first
            const cachedAudio = audioCache.get(cacheKey);
            if (cachedAudio) {
                // Load from cache
                if (!playerRef.current) {
                    playerRef.current = createNarrationPlayer({
                        onPlaybackComplete: handlePlaybackComplete
                    });
                }
                await playerRef.current.load(cachedAudio);
                setLoadingAudio(false);
                return;
            }

            // Generate new audio
            const result = await elevenLabsService.generateSpeech(
                pageText,
                undefined, // Use default voice
                {
                    model_id: "eleven_flash_v2_5"
                }
            );

            // Validate audio format
            if (!(result.audio instanceof Uint8Array)) {
                throw new Error('INVALID_AUDIO_FORMAT');
            }

            // Validate audio data (check if it's not empty and has reasonable size)
            if (result.audio.length === 0) {
                throw new Error('INVALID_AUDIO_EMPTY');
            }

            // Check for minimum valid MP3 size (at least a few hundred bytes)
            if (result.audio.length < 100) {
                throw new Error('INVALID_AUDIO_TOO_SMALL');
            }

            // Store in cache
            audioCache.set(cacheKey, result.audio);

            // Load into player
            if (!playerRef.current) {
                playerRef.current = createNarrationPlayer({
                    onPlaybackComplete: handlePlaybackComplete
                });
            }
            await playerRef.current.load(result.audio);
            setLoadingAudio(false);
        } catch (error) {
            console.error('Error generating audio:', error);

            // Type guard for error with status and name
            const errorWithStatus = error as {
                status?: number;
                message?: string;
                name?: string;
            };

            // Check for audio validation errors
            const isInvalidAudioError = errorWithStatus.message === 'INVALID_AUDIO_FORMAT'
                || errorWithStatus.message === 'INVALID_AUDIO_EMPTY'
                || errorWithStatus.message === 'INVALID_AUDIO_TOO_SMALL'
                || errorWithStatus.message?.toLowerCase().includes('failed to load audio')
                || errorWithStatus.message?.toLowerCase().includes('invalid audio')
                || errorWithStatus.message?.toLowerCase().includes('audio format');

            // Check for timeout/abort errors (DOMException with name 'AbortError')
            const isTimeoutError = errorWithStatus.name === 'AbortError'
                || errorWithStatus.message?.toLowerCase().includes('timeout')
                || errorWithStatus.message?.toLowerCase().includes('aborted');

            // Check for network errors
            const isNetworkError = errorWithStatus.message?.toLowerCase().includes('network')
                || errorWithStatus.message?.toLowerCase().includes('fetch')
                || errorWithStatus.message?.toLowerCase().includes('connection');

            if (errorWithStatus.status === 429) {
                // Set rate limit state - disable narration for 60 seconds
                const resetTime = Date.now() + 60000;
                setRateLimited(true, resetTime);
                setAudioError('Rate limit exceeded. Narration will be automatically re-enabled in 60 seconds.');
                setCanRetry(false);

                // Auto-reset after timeout
                setTimeout(() => {
                    setRateLimited(false);
                    setAudioError(null);
                }, 60000);
            } else if (isInvalidAudioError) {
                setAudioError('Invalid audio data received. This may be a temporary issue.');
                setCanRetry(true);
            } else if (isTimeoutError) {
                setAudioError('Request timed out. Please check your connection and try again.');
                setCanRetry(true);
            } else if (isNetworkError) {
                setAudioError('Network error. Please check your connection and try again.');
                setCanRetry(true);
            } else {
                setAudioError('Failed to generate audio. Please try again.');
                setCanRetry(true);
            }

            setLoadingAudio(false);
        }
    }, [isNarrationEnabled, isRateLimited, setLoadingAudio, setRateLimited, handlePlaybackComplete]);

    const handlePlay = useCallback(async () => {
        if (!playerRef.current || isLoadingAudio) {
            return;
        }

        try {
            await playerRef.current.play();
            setNarrationPlaying(true);
            setAudioError(null);
        } catch (error) {
            // Log playback failure with context
            logger.error(
                LogCategory.AUDIO,
                'Audio playback failed',
                {
                    storyId: storyIdRef.current,
                    pageIndex: currentIndex,
                    error: error instanceof Error ? {
                        name: error.name,
                        message: error.message,
                        stack: error.stack
                    } : String(error)
                }
            );

            // Reset player state
            setNarrationPlaying(false);
            setAudioError('Playback failed. Please try again.');
            setCanRetry(true);

            // Attempt to cleanup and reset the player
            if (playerRef.current) {
                try {
                    playerRef.current.cleanup();
                } catch (cleanupError) {
                    logger.error(
                        LogCategory.AUDIO,
                        'Failed to cleanup player after playback error',
                        { error: cleanupError }
                    );
                }
                playerRef.current = null;
            }
        }
    }, [isLoadingAudio, setNarrationPlaying, currentIndex]);

    const handlePause = useCallback(async () => {
        if (!playerRef.current) {
            return;
        }

        try {
            await playerRef.current.pause();
            setNarrationPlaying(false);
        } catch (error) {
            // Log pause failure with context
            logger.error(
                LogCategory.AUDIO,
                'Audio pause failed',
                {
                    storyId: storyIdRef.current,
                    pageIndex: currentIndex,
                    error: error instanceof Error ? {
                        name: error.name,
                        message: error.message,
                        stack: error.stack
                    } : String(error)
                }
            );

            // Reset player state to stopped
            setNarrationPlaying(false);

            // Cleanup the player as it may be in an invalid state
            if (playerRef.current) {
                try {
                    playerRef.current.cleanup();
                } catch (cleanupError) {
                    logger.error(
                        LogCategory.AUDIO,
                        'Failed to cleanup player after pause error',
                        { error: cleanupError }
                    );
                }
                playerRef.current = null;
            }
        }
    }, [setNarrationPlaying, currentIndex]);

    const handleRetry = useCallback(() => {
        // Clear error state and retry loading audio for current page
        const currentPage = pages[currentIndex];
        if (currentPage && currentPage.text) {
            // Clear any cached data for this page to force regeneration
            const cacheKey = `${storyIdRef.current}-${currentIndex}`;
            audioCache.delete(cacheKey);

            // Regenerate audio
            void generateAndLoadAudio(currentIndex, currentPage.text);
        }
    }, [currentIndex, pages, generateAndLoadAudio]);

    // --- ACTIONS ---
    const goNext = useCallback(() => {
        // Pause audio when navigating
        if (playerRef.current && isNarrationPlaying) {
            void handlePause();
        }

        if (currentIndex < pages.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    }, [currentIndex, pages.length, isNarrationPlaying, handlePause]);

    const goPrev = useCallback(() => {
        // Pause audio when navigating
        if (playerRef.current && isNarrationPlaying) {
            void handlePause();
        }

        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setShowEndMenu(false);
        }
    }, [currentIndex, isNarrationPlaying, handlePause]);

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

    // Generate audio on page change
    useEffect(() => {
        const currentPage = pages[currentIndex];
        if (currentPage && currentPage.text) {
            void generateAndLoadAudio(currentIndex, currentPage.text);
        }
    }, [currentIndex, pages, generateAndLoadAudio]);

    // Cleanup player on unmount
    useEffect(() => {
        return () => {
            if (playerRef.current) {
                playerRef.current.cleanup();
                playerRef.current = null;
            }
            // Clear cache when leaving BookReader
            audioCache.clear();
        };
    }, []);

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
    }, [isLastPage, fadeAnim, showEndMenu]);

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
    }, [currentIndex, pages.length, goNext, goPrev]);

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

                        {onBack ? (
                            <>
                                <TouchableOpacity
                                    style={[styles.endButton, styles.primaryButton]}
                                    onPress={handleRestartStory}
                                >
                                    <Text style={styles.primaryButtonText}>🔄 Read Again</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.endButton, styles.secondaryButton]}
                                    onPress={onBack}
                                >
                                    <Text style={styles.secondaryButtonText}>📚 Back to Bookshelf</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
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
                            </>
                        )}
                    </View>
                </Animated.View>
            )}

            {/* PAGE NAVIGATION CONTROLS */}
            {!showEndMenu && (
                <View style={styles.navigationRow}>
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

            {/* NARRATION CONTROLS */}
            {!showEndMenu && (
                <View style={styles.narrationControlsContainer}>
                    <NarrationControls
                        onPlay={handlePlay}
                        onPause={handlePause}
                        errorMessage={audioError}
                        onRetry={canRetry ? handleRetry : undefined}
                    />
                </View>
            )}

            {/* BACK TO BOOKSHELF */}
            {onBack && !showEndMenu && (
                <TouchableOpacity
                    style={styles.backToBookshelfBtn}
                    onPress={onBack}
                >
                    <Text style={styles.backToBookshelfBtnText}>‹ Bookshelf</Text>
                </TouchableOpacity>
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
    navigationRow: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 9998,
    },
    narrationControlsContainer: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9998,
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
    // BACK TO BOOKSHELF BUTTON
    backToBookshelfBtn: {
        position: 'absolute',
        bottom: 100,
        left: 20,
        backgroundColor: 'rgba(250, 249, 246, 0.92)',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#ddd',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        zIndex: 9998,
    },
    backToBookshelfBtnText: {
        fontSize: 15,
        color: THEME.accent,
        fontWeight: '600',
    },
});

export default BookReader;