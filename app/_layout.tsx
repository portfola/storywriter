import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router'; // <--- 1. Import useRouter, useSegments
import * as SplashScreen from 'expo-splash-screen';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider, useAuth } from '../src/context/AuthContext';

export {
  ErrorBoundary,
} from 'expo-router';

// Delete the unstable_settings; the useEffect below handles this better
// export const unstable_settings = { ... }; 

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync().catch(console.error);
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, loading } = useAuth();

  // 2. SETUP THE TRAFFIC COP HOOKS
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS !== 'web') {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    }
  }, []);

  // 3. THE REDIRECT LOGIC (The "Integration" you asked for)
  useEffect(() => {
    if (loading) return; // Don't do anything while checking session

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // User is NOT logged in, but is trying to access app screens (or root /)
      // Redirect them to the sign-in page
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // User IS logged in, but is on the login page
      // Redirect them to the tabs
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* 4. CLEANER STACK
         Don't conditionally render the screens here. 
         Let the useEffect above handle the security. 
         This prevents "Route not found" errors during the transition.
      */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}