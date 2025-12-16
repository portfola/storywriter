// app/(auth)/login.tsx

import React, { useState } from 'react';
import {
    View,
    SafeAreaView,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Platform,
    Alert
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext'; // Adjust path as needed

// Helper to display errors clearly
const ErrorMessage = ({ messages }: { messages: string[] }) => {
    if (!messages || messages.length === 0) return null;
    return (
        <View style={styles.errorContainer}>
            {messages.map((msg, index) => (
                <Text key={index} style={styles.errorText}>
                    - {msg}
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

        // The device name is crucial for Sanctum to generate a token tied to the device
        const deviceName = Platform.OS === 'web' ? 'web-browser' : Platform.OS;

        try {
            await login(email, name, deviceName);
            // Success: AuthContext updates, RootLayout redirects to (app)/(tabs)
            Alert.alert('Login Successful!');
        } catch (error: any) {
            console.error("Login Error:", error);

            // --- Handle Laravel Validation Errors (422 status) ---
            if (error.response && error.response.status === 422) {
                // Laravel returns validation messages under error.response.data.errors
                setErrors(error.response.data.errors);
            } else {
                // Generic error handling
                Alert.alert(
                    'Sign In Failed',
                    'Could not connect to the API. Please check your network or try again.'
                );
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome to StoryWriter</Text>
            <Text style={styles.subtitle}>Sign In to Test the App</Text>

            {/* Name Input (Used for first-time registration/data collection) */}
            <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!isLoading}
            />
            <ErrorMessage messages={errors.name} />

            {/* Email Input */}
            <TextInput
                style={styles.input}
                placeholder="Email Address"
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
                    {isLoading ? 'Signing In...' : 'Sign In / Register'}
                </Text>
            </TouchableOpacity>

            <Text style={styles.infoText}>
                (If your email is new, an account will be created.)
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 30,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        color: '#666',
        marginBottom: 40,
        textAlign: 'center',
    },
    input: {
        height: 50,
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 10,
        backgroundColor: '#f9f9f9',
    },
    button: {
        backgroundColor: '#007aff',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
    },
    buttonDisabled: {
        backgroundColor: '#a3c3e8',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    errorContainer: {
        marginBottom: 10,
    },
    errorText: {
        color: '#d9534f',
        fontSize: 13,
        marginLeft: 5,
    },
    infoText: {
        marginTop: 15,
        textAlign: 'center',
        fontSize: 12,
        color: '#888',
    }
});