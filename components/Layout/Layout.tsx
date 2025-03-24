import React from 'react';
import { View } from 'react-native';
import { s } from './Layout.style';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';

type Props = {
  children: React.ReactNode;
};

const Layout = ({ children }: Props) => (
  <View style={s.container}>
    <Header />
    <View style={s.content}>{children}</View>
    <Footer />
  </View>
);

export default Layout;
