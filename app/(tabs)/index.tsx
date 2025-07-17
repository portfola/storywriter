import { s } from "./home.style";
import React from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/src/navigation/types';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

import NavButton from '@/components/NavButton/NavButton';
import Layout from '../../components/Layout/Layout';


export default function HomeScreen() {
  const router = useRouter();
  console.log('Current pathname:', router);
  return (
    <Layout>
      <View style={s.container}>
        <Text style={s.title}>StoryWriter</Text>
        <Text style={s.subtitle}>Create amazing stories with your voice!</Text>

        <View style={s.buttonContainer}></View>

        <Link href="/storyscreen" asChild>
          <TouchableOpacity style={s.button}>
            <Text style={s.buttonText}>Start Writing</Text>
          </TouchableOpacity>
        </Link>
        
      </View>
    </Layout>
  );
}