import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import ElevenLabsService from '@/services/elevenLabsService';
import { ConversationSession, ConversationMessage } from '@/types/elevenlabs';
import { useConversationStore } from '@/src/stores/conversationStore';
import { useErrorHandler } from '@/src/hooks/useErrorHandler';
import { ErrorType, ErrorSeverity } from '@/src/utils/errorHandler';
import { conversationLogger, logger, LogCategory } from '@/src/utils/logger';

// Conversation ending is handled by the agent calling the end_call or end_conversation tool
// 
// TO CONFIGURE: In your ElevenLabs agent, add a client tool called "end_call" or "end_conversation"
// with the following configuration:
// - Tool Name: "end_call" or "end_conversation" 
// - Description: "Call this tool when you want to end the conversation and proceed to story generation"
// - Parameters: {} (no parameters needed)
//
// The agent should call this tool when the conversation is complete, rather than relying on
// pattern matching of natural language which is unreliable.

interface Props {
  disabled?: boolean;
}

const ConversationInterface: React.FC<Props> = ({ disabled = false }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [conversationSession, setConversationSession] = useState<ConversationSession | null>(null);
  const [lastAgentMessage, setLastAgentMessage] = useState<number>(0);
  const [inactivityTimeout, setInactivityTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Use the enhanced conversation store
  const {
    phase,
    dialogue,
    addDialogueTurn,
    endConversation,
    normalizedTranscript,
    startConversation: storeStartConversation,
    addError
  } = useConversationStore();
  
  // Use standardized error handling
  const { handleError } = useErrorHandler({
    showAlert: true,
    useChildFriendlyMessages: true
  });
  
  const isConversationActive = phase === 'CONVERSATION_ACTIVE';

  // Story generation is now fully automatic via processTranscript()
  // No manual triggering needed

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Clean up timeout
      if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
      }
      
      // Clean up conversation
      if (conversationSession) {
        conversationLogger.cleanup({ sessionId: conversationSession.conversation?.conversationId });
        ElevenLabsService.forceCleanup();
      }
    };
  }, [conversationSession, inactivityTimeout]);

  const startConversation = async () => {
    if (disabled || isConnecting || isConversationActive) return;

    setIsConnecting(true);
    storeStartConversation();

    try {
      const session = await ElevenLabsService.startConversationAgent({
        onConnect: () => {
          conversationLogger.connected();
          setIsConnecting(false);
        },
        
        onDisconnect: () => {
          conversationLogger.disconnected();
          setConversationSession(null);
          
          // Only auto-end conversation if we have meaningful dialogue
          // Don't end on immediate disconnects (connection failures)
          const currentDialogue = dialogue;
          const hasRealConversation = currentDialogue.length >= 2 && 
                                    currentDialogue.some(turn => turn.role === 'user');
          
          if (hasRealConversation) {
            logger.info(LogCategory.CONVERSATION, 'Auto-ending conversation after disconnect with meaningful dialogue', {
              dialogueLength: currentDialogue.length,
              userTurns: currentDialogue.filter(t => t.role === 'user').length
            });
            // Add small delay to ensure all pending messages are processed
            setTimeout(() => {
              endConversation();
            }, 500);
          } else {
            logger.info(LogCategory.CONVERSATION, 'Connection lost without meaningful conversation - not ending', {
              dialogueLength: currentDialogue.length,
              userTurns: currentDialogue.filter(t => t.role === 'user').length
            });
            // Just reset to initial state instead of trying to process empty conversation
            resetConversation();
          }
        },
        
        onMessage: (message: ConversationMessage) => {
          // PRIMARY HANDLING: Check for actual source/message format first
          if (message.source && message.message) {
            // Map source to role
            const role = message.source === 'user' ? 'user' : 'agent';
            const content = message.message;
            
            if (content.trim()) {
              if (role === 'user') {
                conversationLogger.userMessage(content);
              } else {
                conversationLogger.agentMessage(content);
                setLastAgentMessage(Date.now());
                
                // Clear any existing inactivity timeout
                if (inactivityTimeout) {
                  clearTimeout(inactivityTimeout);
                  setInactivityTimeout(null);
                }
                
                // Set inactivity timeout as backup (30 seconds after last agent message)
                // Agent should call end_call tool when conversation is complete
                const timeout = setTimeout(() => {
                  conversationLogger.timeout();
                  handleEndConversation();
                }, 30000);
                setInactivityTimeout(timeout);
              }
              
              // Add to dialogue immediately
              addDialogueTurn(role, content);
            }
            return; // Exit early after handling primary format
          }
          
          // SECONDARY HANDLING: Fallback to legacy type-based parsing for edge cases only
          
          switch (message.type) {
            case 'user_transcript':
            case 'user_message':
              const userText = message.user_transcription_event?.user_transcript || 
                              message.text || message.content || '';
              if (userText.trim()) {
                conversationLogger.userMessage(userText);
                addDialogueTurn('user', userText);
              }
              break;
              
            case 'agent_response':
            case 'agent_message':
              const agentText = message.agent_response_event?.agent_response ||
                              message.text || message.content || '';
              if (agentText.trim()) {
                conversationLogger.agentMessage(agentText);
                addDialogueTurn('agent', agentText);
                setLastAgentMessage(Date.now());
                
                // Clear any existing inactivity timeout
                if (inactivityTimeout) {
                  clearTimeout(inactivityTimeout);
                  setInactivityTimeout(null);
                }
                
                // Set inactivity timeout as backup (30 seconds after last agent message)
                // Agent should call end_call tool when conversation is complete
                const timeout = setTimeout(() => {
                  conversationLogger.timeout();
                  handleEndConversation();
                }, 30000);
                setInactivityTimeout(timeout);
              }
              break;
              
            case 'client_tool_call':
              const toolCall = message.client_tool_call;
              if (toolCall) {
                conversationLogger.toolCall(toolCall.tool_name, { parameters: toolCall.parameters });
              }
              
              // Handle end conversation tool call
              if (toolCall && (toolCall.tool_name === 'end_conversation' || toolCall.tool_name === 'end_call')) {
                logger.info(LogCategory.CONVERSATION, 'Agent called end tool - ending conversation immediately', {
                  toolName: toolCall.tool_name
                }, '🔚');
                
                // Clear any existing timeout
                if (inactivityTimeout) {
                  clearTimeout(inactivityTimeout);
                  setInactivityTimeout(null);
                }
                
                // End conversation immediately when agent calls the end tool
                handleEndConversation();
              } else if (toolCall) {
                // Handle other potential tool calls
                logger.debug(LogCategory.CONVERSATION, 'Other tool call received', {
                  toolName: toolCall.tool_name,
                  parameters: toolCall.parameters
                }, '🔧');
              }
              break;
              
            case 'audio':
              // Handle audio messages if needed
              logger.debug(LogCategory.CONVERSATION, 'Audio message received', { messageType: message.type }, '🔊');
              break;
              
            case 'ping':
              // Handle ping messages if needed
              logger.debug(LogCategory.CONVERSATION, 'Ping message received', { messageType: message.type }, '🏓');
              break;
              
            default:
              // ERROR HANDLING: If neither format matches, log full message structure for debugging
              if (!message.source && !message.message && !message.type) {
                logger.error(LogCategory.CONVERSATION, 'Unknown message format - full structure logged for debugging', {
                  fullMessage: JSON.stringify(message, null, 2)
                }, '❌');
              } else {
                // Capture any other message types for comprehensive logging
                logger.debug(LogCategory.CONVERSATION, 'Other message type received', { 
                  messageType: message.type,
                  messageContent: JSON.stringify(message).substring(0, 200)
                }, '📋');
              }
          }
        },
        
        onError: (error) => {
          setIsConnecting(false);
          setConversationSession(null);
          handleError(error, ErrorType.CONVERSATION, ErrorSeverity.MEDIUM, {
            action: 'conversation_connection'
          });
        },
        
        onStatusChange: (status) => {
          logger.debug(LogCategory.CONVERSATION, 'Status change', { status }, '📊');
        },
        
        onModeChange: (mode) => {
          logger.debug(LogCategory.CONVERSATION, 'Mode change', { mode }, '🔄');
        }
      });

      setConversationSession(session);
      
    } catch (error) {
      setIsConnecting(false);
      handleError(error, ErrorType.CONVERSATION, ErrorSeverity.MEDIUM, {
        action: 'start_conversation'
      });
    }
  };

  const handleEndConversation = async () => {
    // Clean up inactivity timeout
    if (inactivityTimeout) {
      clearTimeout(inactivityTimeout);
      setInactivityTimeout(null);
    }
    
    if (conversationSession) {
      try {
        await conversationSession.endSession();
      } catch (error) {
        handleError(error, ErrorType.CONVERSATION, ErrorSeverity.LOW, {
          action: 'end_conversation'
        });
      }
    }
    
    setConversationSession(null);
    endConversation(); // Use store's endConversation method
  };

  const handleTestMode = () => {
    if (disabled) return;
    
    // Create a realistic test conversation that mimics an actual child-agent interaction
    const testDialogue = [
      { role: 'agent' as const, content: 'Hi there! I\'m here to help you create an amazing story. What kind of story would you like to make today?' },
      { role: 'user' as const, content: 'I want a story about a dragon!' },
      { role: 'agent' as const, content: 'A dragon story sounds fantastic! What kind of dragon should it be? A friendly dragon, a magical dragon, or maybe a dragon with a special job?' },
      { role: 'user' as const, content: 'A friendly dragon who helps people learn to read books' },
      { role: 'agent' as const, content: 'Oh, I love that idea! A dragon who helps with reading - that\'s so creative! Where should this helpful dragon live? In a library, a magical forest, or somewhere else special?' },
      { role: 'user' as const, content: 'In a big library with lots and lots of books everywhere' },
      { role: 'agent' as const, content: 'Perfect! And who should the dragon help? Maybe some children who are learning to read?' },
      { role: 'user' as const, content: 'Yeah! Kids who are scared to read out loud but the dragon makes them feel brave' },
      { role: 'agent' as const, content: 'That\'s such a wonderful and heartwarming idea! I think we have everything we need to create your story about a brave, helpful dragon in a magical library. Let me create that story for you now!' }
    ];
    
    logger.testEvent('Using test mode with realistic conversation', { 
      dialogueLength: testDialogue.length,
      previewContent: testDialogue.slice(0, 2).map(d => `${d.role}: ${d.content.substring(0, 30)}...`)
    });
    
    // Add each dialogue turn to create a realistic conversation flow
    testDialogue.forEach(turn => {
      addDialogueTurn(turn.role, turn.content);
    });
    
    // Trigger the automatic story generation flow
    endConversation();
  };

  return (
    <View style={styles.container}>
      
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

      {/* Enhanced Conversation Status */}
      {isConversationActive && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            🎙️ Conversation Active - Speak naturally with the StoryWriter Agent!
          </Text>
          <TouchableOpacity
            style={styles.endButton}
            onPress={handleEndConversation}
          >
            <Text style={styles.endButtonText}>End Conversation</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Enhanced Status Display */}
      {phase === 'CONVERSATION_ENDED' && (
        <View style={styles.processingContainer}>
          <Text style={styles.processingText}>
            📝 Conversation ended - processing transcript...
          </Text>
        </View>
      )}

      {phase === 'TRANSCRIPT_PROCESSING' && (
        <View style={styles.processingContainer}>
          <Text style={styles.processingText}>
            🔄 Normalizing transcript and preparing story generation...
          </Text>
        </View>
      )}

      {/* Enhanced Live Conversation Display */}
      {dialogue.length > 0 && isConversationActive && (
        <View style={styles.messagesContainer}>
          <Text style={styles.messagesTitle}>
            Complete Conversation Transcript ({dialogue.length} messages):
          </Text>
          {dialogue.slice(-5).map((turn, index) => (
            <Text key={index} style={styles.messageText}>
              {turn.role === 'user' ? '👤 You' : '🤖 Agent'}: {turn.content}
            </Text>
          ))}
          {dialogue.length > 5 && (
            <Text style={styles.moreMessagesText}>
              ... and {dialogue.length - 5} more exchanges (complete transcript will be saved)
            </Text>
          )}
        </View>
      )}

      {/* Complete Transcript Summary */}
      {dialogue.length > 0 && !isConversationActive && phase !== 'INITIAL' && (
        <View style={styles.transcriptSummary}>
          <Text style={styles.transcriptTitle}>
            📝 Captured Transcript: {dialogue.length} total messages
          </Text>
          <Text style={styles.transcriptStats}>
            User messages: {dialogue.filter(turn => turn.role === 'user').length} | 
            Agent responses: {dialogue.filter(turn => turn.role === 'agent').length}
          </Text>
        </View>
      )}


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
  processingContainer: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  processingText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center' as const,
    fontWeight: '500' as const,
  },
  moreMessagesText: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic' as const,
    textAlign: 'center' as const,
    marginTop: 5,
  },
  transcriptSummary: {
    backgroundColor: '#e8f5e8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: '#c3e6c3',
  },
  transcriptTitle: {
    fontSize: 14,
    color: '#2d5a2d',
    fontWeight: 'bold' as const,
    textAlign: 'center' as const,
    marginBottom: 5,
  },
  transcriptStats: {
    fontSize: 12,
    color: '#4a7a4a',
    textAlign: 'center' as const,
  },
};

export default ConversationInterface;