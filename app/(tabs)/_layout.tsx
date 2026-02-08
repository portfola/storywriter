// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';

// The root layout sets background: 'transparent' so the auth screens can use
// BackgroundImage freely.  That bleeds into tab screens on web — each inactive
// tab stays rendered and shows through the active one.  Override the background
// to an opaque colour scoped to this navigator only.
const tabTheme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: '#FAF9F6' },
};

export default function TabLayout() {
    return (
        <ThemeProvider value={tabTheme}>
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#F0F8FF', // Light cyan
                    borderTopColor: '#FFD93D', // Golden yellow
                    borderTopWidth: 3,
                    paddingBottom: 8,
                    paddingTop: 8,
                    height: 70,
                },
                tabBarActiveTintColor: '#4ECDC4', // Turquoise
                tabBarInactiveTintColor: '#687076', // Muted gray
                tabBarLabelStyle: {
                    fontSize: 14,
                    fontWeight: '600',
                    fontFamily: 'SpaceMono',
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'The Lab',
                    tabBarIcon: ({ color, size }) => (
                        <FontAwesome name="flask" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="bookshelf"
                options={{
                    title: 'Bookshelf',
                    tabBarIcon: ({ color, size }) => (
                        <FontAwesome name="book" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="about"
                options={{
                    title: 'About',
                    tabBarIcon: ({ color, size }) => (
                        <FontAwesome name="info-circle" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
        </ThemeProvider>
    );
}