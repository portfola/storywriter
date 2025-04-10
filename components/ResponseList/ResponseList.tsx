import React from 'react';
import { View, Text } from 'react-native';
import { s } from '../../pages/StoryScreen/StoryScreen.style';

interface Props {
  responses: string[];
}

/**
 * ResponseList Component
 *
 * Displays the user's previously spoken responses.
 * Used to visually track progress before story generation.
 *
 * @param {string[]} responses - Array of user input strings.
 *
 * @returns List of spoken inputs.
 */
const ResponseList: React.FC<Props> = ({ responses }) => (
  <View style={s.responseContainer}>
    <Text style={s.responseLabel}>Your story so far:</Text>
    {responses.map((res, index) => (
      <Text key={index} style={s.responseText}>{index + 1}. {res}</Text>
    ))}
  </View>
);

export default ResponseList;