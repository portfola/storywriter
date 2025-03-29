import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';

interface SpeechControlsProps {
  speechRate: number;
  onSpeechRateChange: (rate: number) => void;
  speechVolume: number;
  onSpeechVolumeChange: (volume: number) => void;
}

const SpeechControls: React.FC<SpeechControlsProps> = ({
  speechRate,
  onSpeechRateChange,
  speechVolume,
  onSpeechVolumeChange
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Speech Rate:</Text>
      <Slider
        style={styles.slider}
        minimumValue={0.5}
        maximumValue={2}
        value={speechRate}
        onValueChange={onSpeechRateChange}
        step={0.1}
      />
      <Text style={styles.value}>{speechRate.toFixed(1)}x</Text>

      <Text style={styles.label}>Speech Volume:</Text>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={1}
        value={speechVolume}
        onValueChange={onSpeechVolumeChange}
        step={0.1}
      />
      <Text style={styles.value}>{(speechVolume * 100).toFixed(0)}%</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  value: {
    fontSize: 14,
    textAlign: 'right',
    marginBottom: 10,
  },
});

export default SpeechControls;