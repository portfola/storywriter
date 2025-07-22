import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import ElevenLabsService from '@/services/elevenLabsService';
import { ConversationSession } from '@/types/elevenlabs';

interface Props {
  onConversationComplete: (transcript: string) => void;
  disabled?: boolean;
}

const ConversationInterface: React.FC<Props> = ({ onConversationComplete, disabled = false }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [conversationSession, setConversationSession] = useState<ConversationSession | null>(null);
  const [messages, setMessages] = useState<string[]>([]);

  const startConversation = async () => {
    if (disabled || isConnecting || isConversationActive) return;

    setIsConnecting(true);
    setMessages([]);

    try {
      const session = await ElevenLabsService.startConversationAgent({
        onConnect: () => {
          console.log('✅ Connected to StoryWriter Agent');
          setIsConnecting(false);
          setIsConversationActive(true);
        },
        
        onDisconnect: () => {
          console.log('❌ Disconnected from StoryWriter Agent');
          setIsConversationActive(false);
          setConversationSession(null);
        },
        
        onMessage: (message) => {
          console.log('💬 Message received:', message);
          
          // Handle different message types
          if (message.type === 'conversation_ended' || message.type === 'agent_response_end') {
            // Extract user responses from the conversation
            const userMessages = messages.filter(msg => !msg.startsWith('[Agent]'));
            const transcript = userMessages.join(' ').trim();
            
            if (transcript) {
              console.log('📝 Conversation transcript:', transcript);
              onConversationComplete(transcript);
              endConversation();
            }
          } else if (message.type === 'user_transcript' || message.type === 'user_message') {
            // Add user message to transcript
            const userText = message.text || message.content || '';
            if (userText.trim()) {
              setMessages(prev => [...prev, userText]);
            }
          } else if (message.type === 'agent_response' || message.type === 'agent_message') {
            // Log agent responses but don't include in final transcript
            const agentText = message.text || message.content || '';
            if (agentText.trim()) {
              setMessages(prev => [...prev, `[Agent]: ${agentText}`]);
            }
          }
        },
        
        onError: (error) => {
          console.error('❌ Conversation error:', error);
          setIsConnecting(false);
          setIsConversationActive(false);
          setConversationSession(null);
          
          Alert.alert(
            'Conversation Error',
            'Failed to connect to the StoryWriter Agent. Please try again or use the test button.',
            [{ text: 'OK' }]
          );
        },
        
        onStatusChange: (status) => {
          console.log('📊 Status:', status);
        },
        
        onModeChange: (mode) => {
          console.log('🔄 Mode:', mode);
        }
      });

      setConversationSession(session);
      
    } catch (error) {
      console.error('❌ Failed to start conversation:', error);
      setIsConnecting(false);
      
      Alert.alert(
        'Connection Error',
        'Could not start conversation with StoryWriter Agent. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const endConversation = async () => {
    if (conversationSession) {
      try {
        await conversationSession.endSession();
      } catch (error) {
        console.error('❌ Error ending conversation:', error);
      }
    }
    
    setIsConversationActive(false);
    setConversationSession(null);
  };

  const handleTestMode = () => {
    if (disabled) return;
    
    const testTranscript = "I want a story about a brave dragon who helps children learn to read";
    console.log('🧪 Using test mode with transcript:', testTranscript);
    onConversationComplete(testTranscript);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose how to create your story:</Text>
      
      {/* Conversational Agent Button */}
      <TouchableOpacity
        style={[
          styles.primaryButton,
          (disabled || isConnecting || isConversationActive) && styles.disabledButton
        ]}
        onPress={startConversation}
        disabled={disabled || isConnecting || isConversationActive}
      >
        <Text style={[
          styles.primaryButtonText,
          (disabled || isConnecting || isConversationActive) && styles.disabledButtonText
        ]}>
          {isConnecting ? '🔄 Connecting...' : 
           isConversationActive ? '🎤 Conversation Active' : 
           '🤖 Talk with StoryWriter Agent'}
        </Text>
      </TouchableOpacity>

      {/* Active Conversation Status */}
      {isConversationActive && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            🎙️ Listening... Speak your story ideas!
          </Text>
          <TouchableOpacity
            style={styles.endButton}
            onPress={endConversation}
          >
            <Text style={styles.endButtonText}>End Conversation</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Messages Display */}
      {messages.length > 0 && (
        <View style={styles.messagesContainer}>
          <Text style={styles.messagesTitle}>Conversation:</Text>
          {messages.slice(-3).map((message, index) => (
            <Text key={index} style={styles.messageText}>
              {message}
            </Text>
          ))}
        </View>
      )}

      {/* Divider */}
      <View style={styles.divider}>
        <Text style={styles.dividerText}>OR</Text>
      </View>

      {/* Test Button */}
      <TouchableOpacity
        style={[styles.testButton, disabled && styles.disabledButton]}
        onPress={handleTestMode}
        disabled={disabled}
      >
        <Text style={[styles.testButtonText, disabled && styles.disabledButtonText]}>
          🧪 Skip to Story Generation (Test)
        </Text>
      </TouchableOpacity>

      <Text style={styles.helpText}>
        Test mode uses a sample story prompt for quick testing
      </Text>
    </View>
  );
};

const styles = {
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    marginBottom: 20,
    textAlign: 'center' as const,
    color: '#333',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 15,
    minWidth: 250,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold' as const,
    textAlign: 'center' as const,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  disabledButtonText: {
    color: '#666',
  },
  statusContainer: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center' as const,
  },
  statusText: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 10,
    textAlign: 'center' as const,
  },
  endButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 5,
  },
  endButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold' as const,
  },
  messagesContainer: {
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  messagesTitle: {
    fontSize: 14,
    fontWeight: 'bold' as const,
    marginBottom: 5,
    color: '#333',
  },
  messageText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  divider: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginVertical: 20,
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#666',
    fontSize: 14,
  },
  testButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
    minWidth: 250,
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold' as const,
    textAlign: 'center' as const,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center' as const,
    fontStyle: 'italic' as const,
  },
};

export default ConversationInterface;