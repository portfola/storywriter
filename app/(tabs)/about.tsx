import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Layout from '../../components/Layout/Layout';

export default function AboutScreen() {
  return (
    <Layout>
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>About StoryWriter</Text>
            <View style={styles.decorativeLine} />
          </View>
          <Text style={styles.text}>Coming soon...</Text>
        </View>
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
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 32,
    padding: 40,
    maxWidth: 600,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 4,
    borderColor: '#FFD93D',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF6B6B',
    textAlign: 'center',
    textShadowColor: 'rgba(255, 107, 107, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
  },
  decorativeLine: {
    width: 160,
    height: 6,
    backgroundColor: '#FFD93D',
    borderRadius: 3,
    marginTop: 16,
  },
  text: {
    fontSize: 22,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
});
