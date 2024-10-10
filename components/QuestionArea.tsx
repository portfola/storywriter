import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';

interface QuestionAreaProps {
  question: string;
  onAnswer: (answer: string) => void;
  onVoiceInput: () => void;
  isListening: boolean;
}

const QuestionArea: React.FC<QuestionAreaProps> = ({ question, onAnswer, onVoiceInput, isListening }) => {
  const [answer, setAnswer] = useState('');

  const handleSubmit = () => {
    onAnswer(answer);
    setAnswer('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.question}>{question}</Text>
      <TextInput
        style={styles.input}
        value={answer}
        onChangeText={setAnswer}
        placeholder="Type your answer here"
      />
      <Button title="Submit" onPress={handleSubmit} />
      <Button 
        title={isListening ? "Stop Listening" : "Voice Input"} 
        onPress={onVoiceInput} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 20,
  },
  question: {
    fontSize: 18,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 10,
  },
});

export default QuestionArea;