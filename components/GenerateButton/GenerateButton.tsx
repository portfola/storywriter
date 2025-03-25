import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { s } from '../../pages/StoryScreen/StoryScreen.style';

interface Props {
  isGenerating: boolean;
  onGenerate: () => void;
}

/**
 * GenerateButton Component
 *
 * Button used to trigger story and image generation.
 * Appears after user has provided input or stopped recording.
 *
 * @param {boolean} isGenerating - Whether generation is in progress.
 * @param {() => void} onGenerate - Called when the button is pressed.
 *
 * @returns Story generation button.
 */
const GenerateButton: React.FC<Props> = ({ isGenerating, onGenerate }) => (
  <TouchableOpacity style={s.finishButton} onPress={onGenerate} disabled={isGenerating}>
    <Text style={s.buttonText}>{isGenerating ? 'Generating...' : 'Generate Story with Images'}</Text>
  </TouchableOpacity>
);

export default GenerateButton;