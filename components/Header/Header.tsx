import { s } from "./Header.style.js";
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';

/**
 * Header Component
 *
 * Displays the app title and navigation links.
 * Used at the top of every screen via the Layout wrapper.
 *
 * @returns React component with navigation and title.
 */
const Header = () => {
  return (
    <View style={s.container}>
      <Text style={s.title}>StoryWriter</Text>
      <View style={s.navLinks}>
        <Link href="/" asChild>
          <TouchableOpacity>
            <Text style={s.link}>Home</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/storyscreen" asChild>
          <TouchableOpacity>
            <Text style={s.link}>Story</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
};


export default Header;
