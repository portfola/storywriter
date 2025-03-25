import React from 'react';
import { View } from 'react-native';
import { s } from './Layout.style';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';

type Props = {
  children: React.ReactNode;
};

/**
 * Layout Component
 *
 * Wraps screen content with a shared Header and Footer.
 * Provides consistent structure across pages.
 *
 * @param {React.ReactNode} children - The main content to render between Header and Footer.
 *
 * @returns Structured layout component for screens.
 */
const Layout = ({ children }: Props) => (
  <View style={s.container}>
    <Header />
    <View style={s.content}>{children}</View>
    <Footer />
  </View>
);

export default Layout;
