import { s } from "./Header.style.js";
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const Header = () => {
  const navigation = useNavigation<NavigationProp>();

  return (
    <View style={s.container}>
      <Text style={s.title}>StoryWriter</Text>
      <View style={s.navLinks}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Text style={s.link}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Story')}>
          <Text style={s.link}>Story</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};


export default Header;
