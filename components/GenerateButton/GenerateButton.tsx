import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { s } from '../pages/StoryScreen/StoryScreen.style';

interface Props {
  isGenerating: boolean;
  onGenerate: () => void;
}

const GenerateButton: React.FC<Props> = ({ isGenerating, onGenerate }) => (
  <TouchableOpacity style={s.finishButton} onPress={onGenerate} disabled={isGenerating}>
    <Text style={s.buttonText}>{isGenerating ? 'Generating...' : 'Generate Story with Images'}</Text>
  </TouchableOpacity>
);

export default GenerateButton;