// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function TabLayout() {
    return (
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
                    title: 'Home',
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
    );
}