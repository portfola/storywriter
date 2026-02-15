import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Switch } from 'react-native';
import { useConversationStore } from '@/src/stores/conversationStore';
import { styles, THEME } from './NarrationControls.style';

interface NarrationControlsProps {
    /** Callback to handle play button press */
    onPlay: () => void;
    /** Callback to handle pause button press */
    onPause: () => void;
    /** Optional error message to display */
    errorMessage?: string | null;
}

export function NarrationControls({ onPlay, onPause, errorMessage }: NarrationControlsProps) {
    const {
        isNarrationEnabled,
        isNarrationPlaying,
        isLoadingAudio,
        autoAdvancePages,
        setNarrationEnabled,
        setAutoAdvancePages
    } = useConversationStore();

    // Don't render anything if narration is disabled
    if (!isNarrationEnabled) {
        return null;
    }

    return (
        <View style={styles.container}>
            {/* Narration Toggle */}
            <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Narration</Text>
                <Switch
                    value={isNarrationEnabled}
                    onValueChange={setNarrationEnabled}
                    trackColor={{ false: '#ccc', true: THEME.accent }}
                    thumbColor="#fff"
                />
            </View>

            {/* Play/Pause Controls */}
            <View style={styles.controlsRow}>
                {isLoadingAudio ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={THEME.accent} />
                        <Text style={styles.loadingText}>Loading audio...</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        onPress={isNarrationPlaying ? onPause : onPlay}
                        style={styles.playPauseButton}
                        disabled={isLoadingAudio}
                        accessible={true}
                        accessibilityLabel={isNarrationPlaying ? "Pause narration" : "Play narration"}
                        accessibilityRole="button"
                    >
                        <Text style={styles.playPauseIcon}>
                            {isNarrationPlaying ? '⏸' : '▶️'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Auto-advance Toggle */}
            <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Auto-advance pages</Text>
                <Switch
                    value={autoAdvancePages}
                    onValueChange={setAutoAdvancePages}
                    trackColor={{ false: '#ccc', true: THEME.accent }}
                    thumbColor="#fff"
                    disabled={isLoadingAudio}
                />
            </View>

            {/* Error Message Display */}
            {errorMessage && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
            )}
        </View>
    );
}
