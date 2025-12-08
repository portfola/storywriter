// app/_layout.tsx (The Gatekeeper)

import { Stack, Redirect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';

export default function RootLayout() {
    const { user, loading } = useAuth(); // AuthContext should provide user object

    if (loading) {
        return <SplashScreen />; // Or a simple Loading Text
    }

    // --- The Crucial Logic ---

    // If the user is logged out (no user object), redirect them to the (auth) group
    if (!user) {
        return <Redirect href="/login" />;
    }

    // If the user is logged in, the default behavior renders the (app) group
    return (
        <Stack>
            {/* Hide the default header for the main navigation */}
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
    );
}