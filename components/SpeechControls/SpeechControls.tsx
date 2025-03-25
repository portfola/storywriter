import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { s } from '../pages/StoryScreen/StoryScreen.style';

interface Props {
  isListening: boolean;
  onStart: () => void;
  onStop: () => void;
}

const SpeechControls: React.FC<Props> = ({ isListening, onStart, onStop }) => (
  <View style={s.buttonContainer}>
    <TouchableOpacity style={s.button} onPress={onStart} disabled={isListening}>
      <Text style={s.buttonText}>{isListening ? 'Listening...' : 'Tap to Speak'}</Text>
    </TouchableOpacity>
    {isListening && (
      <TouchableOpacity style={[s.button, s.stopButton]} onPress={onStop}>
        <Text style={s.buttonText}>Stop Listening</Text>
      </TouchableOpacity>
    )}
  </View>
);

export default SpeechControls;
