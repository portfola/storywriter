import { Platform, Text, TouchableOpacity } from 'react-native';
import { Link, router } from 'expo-router';
import React from 'react';

interface NavButtonProps {
  href: string;
  label: string;
}

/**
 * NavButton
 * Cross-platform navigation button:
 * - Uses <Link> on web for correct routing.
 * - Uses router.push on native for gesture compatibility.
 */
export const NavButton = ({ href, label }: NavButtonProps) => {
    console.log(Platform.OS);
  if (Platform.OS === 'web') {
    return (
      <Link href={href} asChild>
        <TouchableOpacity>
          <Text>{label}</Text>
        </TouchableOpacity>
      </Link>
    );
  }

  return (
    <TouchableOpacity onPress={() => router.push(href)}>
      <Text>{label}</Text>
    </TouchableOpacity>
  );
};
