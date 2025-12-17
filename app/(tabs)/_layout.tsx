// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
    return (
        <Tabs screenOptions={{ headerShown: false }}>
            {/* Define your tab screens here. 
        The 'name' must match the filename (e.g., home.tsx) 
      */}
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Home',
                    // You can add icons here later
                }}
            />
        </Tabs>
    );
}