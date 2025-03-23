import { s } from "./Home.style";
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../src/navigation/types';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  return (
    <View style={s.container}>
      <Text style={s.title}>StoryWriter</Text>
      <Text style={s.subtitle}>Create amazing stories with your voice!</Text>
      
      <View style={s.buttonContainer}></View>
      <TouchableOpacity 
      style={s.button}
      onPress={() => navigation.navigate('Story')}>
        <Text style={s.buttonText}>Start Writing</Text>
      </TouchableOpacity>
        </View>
  );
};

export default HomeScreen;
