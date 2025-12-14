import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import BackendConnectivityService from '@/src/utils/backendConnectivity';
import { AuthProvider, useAuth } from '../src/context/AuthContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)', // Changed to point to your likely starting group
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
void SplashScreen.preventAutoHideAsync();

// 1. THE OUTER COMPONENT
// Its ONLY job is to load fonts and wrap the app in the AuthProvider.
export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Handle Font Errors
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // Hide Splash Screen once fonts are loaded
  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  // CRITICAL FIX: The AuthProvider wraps the inner component
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

// 2. THE INNER COMPONENT
// This component is INSIDE the Provider, so useAuth() works here.
function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, loading } = useAuth(); // Now safe to use!

  // Run your Side Effects (Orientation, Connectivity) here
  useEffect(() => {
    if (Platform.OS !== 'web') {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    }
    // Test backend connectivity
    void BackendConnectivityService.testConnection();
  }, []);

  // Show a spinner while checking if user is logged in
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>

        {/* CONDITIONALLY RENDER GROUPS */}
        {isAuthenticated ? (
          // If logged in, only show the App/Tabs
          <Stack.Screen name="(app)" />
        ) : (
          // If logged out, only show the Auth flow
          <Stack.Screen name="(auth)" />
        )}

        {/* The modal is available globally */}
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />

      </Stack>
    </ThemeProvider>
  );
}