import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { s } from ',,./../pages/StoryScreen/StoryScreen.style';

interface Props {
  onStartConversation: () => void;
}

const SpeechControls: React.FC<Props> = ({ onStartConversation }) => (
  <View style={s.buttonContainer}>
    <TouchableOpacity style={s.button} onPress={onStartConversation}>
      <Text style={s.buttonText}>Start Conversation</Text>
    </TouchableOpacity>
  </View>
);

export default SpeechControls;
