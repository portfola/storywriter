import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface EndOfStoryMenuProps {
    onRestartStory: () => void;
    onNewStory: () => void;
    onExit: () => void;
}

const EndOfStoryMenu: React.FC<EndOfStoryMenuProps> = ({
    onRestartStory,
    onNewStory,
    onExit,
}) => {
    return (
        <View style={styles.endMenuContainer}>
            <Text style={styles.endTitle}>The End! 🎉</Text>
            <Text style={styles.endSubtitle}>What would you like to do?</Text>

            <TouchableOpacity
                style={[styles.endButton, styles.primaryButton]}
                onPress={onNewStory}
            >
                <Text style={styles.primaryButtonText}>✨ Create New Story</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.endButton, styles.secondaryButton]}
                onPress={onRestartStory}
            >
                <Text style={styles.secondaryButtonText}>🔄 Read Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.endButton, styles.tertiaryButton]}
                onPress={onExit}
            >
                <Text style={styles.tertiaryButtonText}>🏠 Exit</Text>
            </TouchableOpacity>
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f0',
    },
    storyContent: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    storyText: {
        fontSize: 18,
        lineHeight: 28,
        fontFamily: 'Georgia',
        color: '#333',
    },
    endMenuContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    endTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    endSubtitle: {
        fontSize: 18,
        color: '#666',
        marginBottom: 40,
    },
    endButton: {
        width: '100%',
        padding: 18,
        borderRadius: 12,
        marginBottom: 16,
        alignItems: 'center',
    },
    primaryButton: {
        backgroundColor: '#007AFF',
    },
    primaryButtonText: {
        fontSize: 20,
        fontWeight: '600',
        color: 'white',
    },
    secondaryButton: {
        backgroundColor: '#f0f0f0',
        borderWidth: 2,
        borderColor: '#007AFF',
    },
    secondaryButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#007AFF',
    },
    tertiaryButton: {
        backgroundColor: 'transparent',
    },
    tertiaryButtonText: {
        fontSize: 16,
        color: '#666',
    },
});

export default EndOfStoryMenu;