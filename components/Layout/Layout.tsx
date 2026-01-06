import React from 'react';
import { View } from 'react-native';
import { s } from './Layout.style';
import BackgroundImage from '../BackgroundImage/BackgroundImage';

type Props = {
  children: React.ReactNode;
};

/**
 * Layout Component
 *
 * Wraps screen content with a background image.
 * Provides consistent structure across pages.
 *
 * @param {React.ReactNode} children - The main content to render.
 *
 * @returns Structured layout component for screens.
 */
const Layout = ({ children }: Props) => (
  <BackgroundImage opacity={0.4}>
    <View style={s.container}>
      <View style={s.content}>{children}</View>
    </View>
  </BackgroundImage>
);

export default Layout;
