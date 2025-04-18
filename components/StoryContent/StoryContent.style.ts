// components/StoryContent/StoryContent.style.ts
import { StyleSheet } from "react-native";

export const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
  },
  // Keep old styles for backward compatibility
  storyContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  storyText: {
    fontSize: 18,
    lineHeight: 26,
    color: '#2c3e50',
  },
  storyImage: {
    width: '100%',
    height: '100%',
    marginVertical: 10,
  },
});