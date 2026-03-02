import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Platform,
    ScrollView,
    PanResponder,
    Animated,
    useWindowDimensions,
    StyleSheet,
} from 'react-native';
import RenderHtml from 'react-native-render-html';
import { useConversationStore, StorySection } from '@/src/stores/conversationStore';

interface BookReaderProps {
    sections?: StorySection[];
    onBack?: () => void;
}

const THEME = { paper: '#FAF9F6', text: '#2D2D2D', accent: '#D35400' };

const BookReader = ({ sections: sectionsProp, onBack }: BookReaderProps = {}) => {
    const { story, resetConversation } = useConversationStore();
    const { width } = useWindowDimensions();

    const pages = sectionsProp?.length
        ? sectionsProp
        : story.sections?.length
            ? story.sections
            : [{ text: 'Loading story...', imageUrl: null }];

    const [currentIndex, setCurrentIndex] = useState(0);
    const [showEndMenu, setShowEndMenu] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const isLastPage = currentIndex === pages.length - 1;

    const goNext = useCallback(() => {
        if (currentIndex < pages.length - 1) setCurrentIndex(i => i + 1);
    }, [currentIndex, pages.length]);

    const goPrev = useCallback(() => {
        if (currentIndex > 0) { setCurrentIndex(i => i - 1); setShowEndMenu(false); }
    }, [currentIndex]);

    const handleRestartStory = () => {
        setCurrentIndex(0);
        setShowEndMenu(false);
        fadeAnim.setValue(0);
    };

    useEffect(() => {
        if (isLastPage && !showEndMenu) {
            const t = setTimeout(() => {
                setShowEndMenu(true);
                Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
            }, 500);
            return () => clearTimeout(t);
        }
    }, [isLastPage, showEndMenu]);

    useEffect(() => {
        if (Platform.OS !== 'web') return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') goNext();
            else if (e.key === 'ArrowLeft') goPrev();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [goNext, goPrev]);

    const panResponder = useRef(PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20,
        onPanResponderRelease: (_, g) => { if (g.dx < -50) goNext(); else if (g.dx > 50) goPrev(); },
    })).current;

    const coverHtml = currentIndex === 0
        ? `${story.title ?? ''}${story.coverImage ? `<img src="${story.coverImage}" style="width:100%;border-radius:8px;margin-bottom:16px;" />` : ''}`
        : '';
    const htmlSource = { html: `${coverHtml}${pages[currentIndex] ?? '<p></p>'}` };

    return (
        <View style={styles.container} {...panResponder.panHandlers}>
            <View style={styles.pageWrapper}>
                <Text style={styles.pageNumber}>Page {currentIndex + 1} of {pages.length}</Text>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <RenderHtml contentWidth={width - 80} source={htmlSource} />
                </ScrollView>
            </View>

            {showEndMenu && isLastPage && (
                <Animated.View style={[styles.endMenuOverlay, { opacity: fadeAnim }]}>
                    <View style={styles.endMenuContainer}>
                        <Text style={styles.endTitle}>The End! 🎉</Text>
                        <Text style={styles.endSubtitle}>What would you like to do?</Text>
                        <TouchableOpacity style={[styles.endButton, styles.primaryButton]} onPress={resetConversation}>
                            <Text style={styles.primaryButtonText}>✨ Create New Story</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.endButton, styles.secondaryButton]} onPress={handleRestartStory}>
                            <Text style={styles.secondaryButtonText}>🔄 Read Again</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.endButton, styles.tertiaryButton]} onPress={resetConversation}>
                            <Text style={styles.tertiaryButtonText}>🏠 Exit</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            )}

            {!showEndMenu && (
                <View style={styles.controlsOverlay}>
                    <TouchableOpacity onPress={goPrev} style={[styles.navButton, currentIndex === 0 && styles.disabledBtn]} disabled={currentIndex === 0}>
                        <Text style={styles.navArrow}>‹</Text>
                    </TouchableOpacity>
                    <View style={styles.dotsContainer}>
                        {pages.map((_, i) => <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />)}
                    </View>
                    <TouchableOpacity onPress={goNext} style={[styles.navButton, isLastPage && styles.disabledBtn]} disabled={isLastPage}>
                        <Text style={styles.navArrow}>›</Text>
                    </TouchableOpacity>
                </View>
            )}

            {onBack && !showEndMenu && (
                <TouchableOpacity style={styles.backToBookshelfBtn} onPress={onBack}>
                    <Text style={styles.backToBookshelfBtnText}>‹ Bookshelf</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const shadow = { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 };

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: THEME.paper, alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' },
    pageWrapper: { width: '100%', maxWidth: 800, height: '100%', paddingBottom: 100, paddingTop: 20, paddingHorizontal: 20 },
    scrollContent: { flexGrow: 1, alignItems: 'center', paddingBottom: 40 },
    pageNumber: { textAlign: 'center', color: '#999', fontSize: 12, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
    controlsOverlay: {
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 90,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20,
        backgroundColor: 'rgba(250, 249, 246, 0.95)', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)',
        zIndex: 9999, paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    },
    navButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow, elevation: 4, borderWidth: 1, borderColor: '#eee' },
    disabledBtn: { opacity: 0.3, backgroundColor: '#f5f5f5' },
    navArrow: { fontSize: 32, color: THEME.accent, marginTop: -4, fontWeight: '300' },
    dotsContainer: { flexDirection: 'row', gap: 8 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ddd' },
    dotActive: { backgroundColor: THEME.accent, width: 12 },
    endMenuOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(250, 249, 246, 0.98)', justifyContent: 'center', alignItems: 'center', zIndex: 10000 },
    endMenuContainer: { width: '90%', maxWidth: 400, padding: 30, alignItems: 'center' },
    endTitle: { fontSize: 36, fontWeight: 'bold', color: THEME.text, marginBottom: 10, textAlign: 'center' },
    endSubtitle: { fontSize: 18, color: '#666', marginBottom: 40, textAlign: 'center' },
    endButton: { width: '100%', padding: 18, borderRadius: 12, marginBottom: 16, alignItems: 'center', ...shadow, elevation: 3 },
    primaryButton: { backgroundColor: THEME.accent },
    primaryButtonText: { fontSize: 20, fontWeight: '600', color: 'white' },
    secondaryButton: { backgroundColor: '#fff', borderWidth: 2, borderColor: THEME.accent },
    secondaryButtonText: { fontSize: 18, fontWeight: '600', color: THEME.accent },
    tertiaryButton: { backgroundColor: 'transparent' },
    tertiaryButtonText: { fontSize: 16, color: '#666' },
    backToBookshelfBtn: { position: 'absolute', bottom: 100, left: 20, backgroundColor: 'rgba(250, 249, 246, 0.92)', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1, borderColor: '#ddd', ...shadow, elevation: 3, zIndex: 9998 },
    backToBookshelfBtnText: { fontSize: 15, color: THEME.accent, fontWeight: '600' },
});

export default BookReader;