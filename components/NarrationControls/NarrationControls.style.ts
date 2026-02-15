import { StyleSheet } from 'react-native';

export const THEME = {
    accent: '#D35400',
    text: '#2D2D2D',
    background: 'rgba(250, 249, 246, 0.95)',
    errorRed: '#d32f2f',
};

export const styles = StyleSheet.create({
    container: {
        backgroundColor: THEME.background,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        gap: 12,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 44, // Accessibility: minimum touch target
    },
    toggleLabel: {
        fontSize: 16,
        color: THEME.text,
        fontWeight: '500',
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 60,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    loadingText: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
    },
    playPauseButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: THEME.accent,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
        // Accessibility: minimum 44x44 touch target (exceeds requirement with 60x60)
    },
    playPauseIcon: {
        fontSize: 24,
        color: 'white',
    },
    errorContainer: {
        backgroundColor: '#ffebee',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: THEME.errorRed,
    },
    errorText: {
        fontSize: 14,
        color: THEME.errorRed,
        textAlign: 'center',
        lineHeight: 20,
    },
});
