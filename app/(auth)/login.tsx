// app/(auth)/login.tsx

import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Platform,
    Alert
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import BackgroundImage from '../../components/BackgroundImage/BackgroundImage';

// Helper to display errors clearly
const ErrorMessage = ({ messages }: { messages: string[] }) => {
    if (!messages || messages.length === 0) return null;
    return (
        <View style={styles.errorContainer}>
            {messages.map((msg, index) => (
                <Text key={index} style={styles.errorText}>
                    • {msg}
                </Text>
            ))}
        </View>
    );
};

export default function LoginScreen() {
    const { login } = useAuth();

    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string[] }>({});

    const handleLogin = async () => {
        setIsLoading(true);
        setErrors({});

        const deviceName = Platform.OS === 'web' ? 'web-browser' : Platform.OS;

        try {
            await login(email, name, deviceName);
            Alert.alert('Welcome to StoryWriter! 🎉');
        } catch (error: any) {
            console.error("Login Error:", error);

            if (error.response && error.response.status === 422) {
                setErrors(error.response.data.errors);
            } else {
                Alert.alert(
                    'Oops! Something went wrong',
                    'Please check your connection and try again.'
                );
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <BackgroundImage opacity={0.4}>
            <View style={styles.container}>
                <View style={styles.card}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>Welcome to the</Text>
                        <Text style={styles.labTitle}>StoryWriter Lab!</Text>
                        <View style={styles.decorativeLine} />
                    </View>

                    <Text style={styles.subtitle}>Let's get you started on your adventure!</Text>

                    <View style={styles.formContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Your Name"
                            placeholderTextColor="#999"
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                            editable={!isLoading}
                        />
                        <ErrorMessage messages={errors.name} />

                        <TextInput
                            style={styles.input}
                            placeholder="Parent's Email"
                            placeholderTextColor="#999"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            editable={!isLoading}
                        />
                        <ErrorMessage messages={errors.email} />

                        <TouchableOpacity
                            style={[styles.button, isLoading && styles.buttonDisabled]}
                            onPress={handleLogin}
                            disabled={isLoading}
                        >
                            <Text style={styles.buttonText}>
                                {isLoading ? 'Getting Ready...' : 'Enter the Lab! ✨'}
                            </Text>
                        </TouchableOpacity>

                        <Text style={styles.infoText}>
                            New here? No worries! We'll create your account automatically.
                        </Text>
                    </View>
                </View>
            </View>
        </BackgroundImage>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 24,
        padding: 32,
        maxWidth: 480,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 3,
        borderColor: '#FFD93D',
    },
    titleContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '600',
        color: '#444',
        textAlign: 'center',
    },
    labTitle: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#FF6B6B',
        textAlign: 'center',
        marginTop: 4,
        textShadowColor: 'rgba(255, 107, 107, 0.2)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 4,
    },
    decorativeLine: {
        width: 120,
        height: 4,
        backgroundColor: '#FFD93D',
        borderRadius: 2,
        marginTop: 12,
    },
    subtitle: {
        fontSize: 18,
        color: '#666',
        marginBottom: 24,
        textAlign: 'center',
        fontWeight: '500',
    },
    formContainer: {
        width: '100%',
    },
    input: {
        height: 54,
        borderColor: '#DDD',
        borderWidth: 2,
        borderRadius: 16,
        paddingHorizontal: 20,
        marginBottom: 12,
        backgroundColor: '#FFF',
        fontSize: 16,
        fontWeight: '500',
    },
    button: {
        backgroundColor: '#4ECDC4',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: '#4ECDC4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 2,
        borderColor: '#45B8B0',
    },
    buttonDisabled: {
        backgroundColor: '#B8E6E3',
        borderColor: '#A0D5D2',
        shadowOpacity: 0.1,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    errorContainer: {
        marginBottom: 12,
        backgroundColor: '#FFE5E5',
        padding: 12,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#FF6B6B',
    },
    errorText: {
        color: '#D63031',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 4,
    },
    infoText: {
        marginTop: 16,
        textAlign: 'center',
        fontSize: 13,
        color: '#888',
        fontStyle: 'italic',
    }
});