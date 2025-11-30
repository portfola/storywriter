import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import Layout from '../../components/Layout/Layout';
import { s } from '../../pages/Home/Home.style';


export default function HomeScreen() {

  return (
    <Layout>
      <View style={s.container}>
        <Text style={s.title}>StoryWriter</Text>
        <Text style={s.subtitle}>Create amazing stories with your voice!</Text>

        <View style={s.buttonContainer}></View>

        <Link href="/" asChild>
          <TouchableOpacity style={s.button}>
            <Text style={s.buttonText}>Start Writing</Text>
          </TouchableOpacity>
        </Link>

      </View>
    </Layout>
  );
}