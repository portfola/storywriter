import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Layout from '../../components/Layout/Layout';

export default function AboutScreen() {
  return (
    <Layout>
      <View style={styles.container}>
        <Text style={styles.title}>About StoryWriter</Text>
        <Text style={styles.text}>Coming soon...</Text>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  text: {
    fontSize: 18,
    color: '#666',
  },
});
