import React, { useState } from 'react';
import { View, Text, Button, FlatList, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { StoryPage } from '../src/utils/storyGenerator'; // Import this

interface Story {
  title: string;
  content: StoryPage[];
  elements: { [key: string]: string };
}

interface StoryManagementProps {
  onSave: () => void;
  onLoad: (index: number) => void;
  savedStories: Story[];
}

const StoryManagement: React.FC<StoryManagementProps> = ({ onSave, onLoad, savedStories }) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleSave = () => {
    onSave();
    // You might want to show a confirmation message here
  };

  const handleLoad = (index: number) => {
    onLoad(index);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Button title="Save Story" onPress={handleSave} />
      <Button title="Load Story" onPress={() => setModalVisible(true)} />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Saved Stories</Text>
            {savedStories.length > 0 ? (
              <FlatList
                data={savedStories}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    style={styles.storyItem}
                    onPress={() => handleLoad(index)}
                  >
                    <Text>{item.title}</Text>
                  </TouchableOpacity>
                )}
              />
            ) : (
              <Text>No saved stories</Text>
            )}
            <Button title="Close" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  storyItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    width: '100%',
  },
});

export default StoryManagement;