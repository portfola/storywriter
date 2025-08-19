import React from 'react';
import { s } from "./Footer.style";
import { View, Text } from 'react-native';


/**
 * Footer Component
 *
 * Displays a fixed footer with copyright info.
 * Included at the bottom of every screen via the Layout.
 *
 * @returns React component for app footer.
 */

const Footer = () => (
  <View style={s.container}>
    <Text style={s.text}>© 2025 StoryWriter</Text>
  </View>
);


export default Footer;
