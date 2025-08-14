import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import ElevenLabsService from '@/services/elevenLabsService';
import { ConversationSession, ConversationMessage } from '@/types/elevenlabs';
import { useConversationStore } from '@/src/stores/conversationStore';
import { useErrorHandler } from '@/src/hooks/useErrorHandler';
import { ErrorType, ErrorSeverity } from '@/src/utils/errorHandler';
import { conversationLogger, logger, LogCategory } from '@/src/utils/logger';
import { TranscriptNormalizer, DialogueTurn } from '@/src/utils/transcriptNormalizer';

interface Props {
  disabled?: boolean;
}

const ConversationInterface: React.FC<Props> = ({ disabled = false }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [conversationSession, setConversationSession] = useState<ConversationSession | null>(null);
  const rawMessages = useRef<{role: 'user'|'agent', content: string, timestamp: number}[]>([]);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingFlushRef = useRef<boolean>(false);
  
  // Simplified store usage - trust ElevenLabs for conversation management
  const {
    phase,
    startConversation: storeStartConversation,
    endConversation: storeEndConversation
  } = useConversationStore();
  
  const { handleError } = useErrorHandler({
    showAlert: true,
    useChildFriendlyMessages: true
  });
  
  const isConversationActive = phase === 'ACTIVE';

  // Debounced flush mechanism
  const scheduleFlush = useCallback(() => {
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
    }
    
    flushTimeoutRef.current = setTimeout(() => {
      if (pendingFlushRef.current && rawMessages.current.length > 0) {
        logger.info(LogCategory.CONVERSATION, 'Debounced flush triggered - processing transcript', {
          messageCount: rawMessages.current.length
        });
        processTranscriptAndEnd();
      }
    }, 2000);
  }, []);

  // Validate and process transcript
  const processTranscriptAndEnd = useCallback(() => {
    const messages = rawMessages.current;
    const userMessages = messages.filter(msg => msg.role === 'user');
    
    if (userMessages.length < 2) {
      logger.warn(LogCategory.CONVERSATION, 'Insufficient user messages for story generation', {
        totalMessages: messages.length,
        userMessages: userMessages.length,
        minRequired: 2
      });
      return;
    }

    const dialogueTurns: DialogueTurn[] = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp
    }));
    
    const finalTranscript = TranscriptNormalizer.generateTranscript(dialogueTurns);
    
    logger.info(LogCategory.CONVERSATION, 'Generated final transcript with validation passed', {
      originalMessages: messages.length,
      userMessages: userMessages.length,
      processedLength: finalTranscript.length,
      fullTranscript: finalTranscript
    });
    
    pendingFlushRef.current = false;
    handleEndConversation(finalTranscript);
  }, []);

  // Cleanup on unmount and reset messages when starting new conversation
  useEffect(() => {
    return () => {
      if (conversationSession) {
        conversationLogger.cleanup({ sessionId: conversationSession.conversation?.conversationId });
        ElevenLabsService.forceCleanup();
      }
    };
  }, [conversationSession]);
  
  // Reset messages when starting new conversation
  useEffect(() => {
    if (isConnecting) {
      rawMessages.current = [];
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
        flushTimeoutRef.current = null;
      }
      pendingFlushRef.current = false;
    }
  }, [isConnecting]);

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
          // Let ElevenLabs handle the conversation flow - no premature ending
        },
        
        onMessage: (message: ConversationMessage) => {
          // Capture messages for real transcript generation
          if (message.source && message.message && message.message.trim()) {
            const role = message.source === 'user' ? 'user' : 'agent';
            const timestamp = Date.now();
            const content = message.message!.trim();
            
            rawMessages.current = [...rawMessages.current, { 
              role, 
              content, 
              timestamp 
            }];
            
            logger.debug(LogCategory.CONVERSATION, `${role} message captured`, { 
              fullContent: content,
              messageCount: rawMessages.current.length
            });
            
            // Schedule debounced flush
            pendingFlushRef.current = true;
            scheduleFlush();
          }
          
          // Handle end_conversation tool calls
          if (message.type === 'client_tool_call') {
            const toolCall = message.client_tool_call;
            
            if (toolCall && (toolCall.tool_name === 'end_conversation' || toolCall.tool_name === 'end_call')) {
              logger.info(LogCategory.CONVERSATION, 'Agent called end tool - cancelling debounce and processing immediately', {
                toolName: toolCall.tool_name,
                messageCount: rawMessages.current.length
              });
              
              // Cancel any pending flush and process immediately
              if (flushTimeoutRef.current) {
                clearTimeout(flushTimeoutRef.current);
                flushTimeoutRef.current = null;
              }
              
              pendingFlushRef.current = false;
              processTranscriptAndEnd();
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
        
        // Removed status/mode logging as they provide no value
      });

      setConversationSession(session);
      
    } catch (error) {
      setIsConnecting(false);
      handleError(error, ErrorType.CONVERSATION, ErrorSeverity.MEDIUM, {
        action: 'start_conversation'
      });
    }
  };

  const handleEndConversation = async (finalTranscript: string) => {
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
    // Pass the final transcript to the store for story generation
    storeEndConversation(finalTranscript);
  };

  const handleManualEnd = async () => {
    // Cancel any pending debounced flush
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }
    pendingFlushRef.current = false;
    
    // For manual ending, process the captured messages
    if (rawMessages.current.length > 0) {
      const messages = rawMessages.current;
      const userMessages = messages.filter(msg => msg.role === 'user');
      
      if (userMessages.length < 2) {
        logger.warn(LogCategory.CONVERSATION, 'Manual end attempted with insufficient user messages', {
          totalMessages: messages.length,
          userMessages: userMessages.length,
          minRequired: 2
        });
        // Still allow manual end but with warning
      }
      
      const dialogueTurns: DialogueTurn[] = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }));
      
      const finalTranscript = TranscriptNormalizer.generateTranscript(dialogueTurns);
      
      logger.info(LogCategory.CONVERSATION, 'Manual end with real transcript', {
        messageCount: messages.length,
        userMessages: userMessages.length,
        transcriptLength: finalTranscript.length,
        fullTranscript: finalTranscript
      });
      
      await handleEndConversation(finalTranscript);
    } else {
      // Fallback to test transcript if no messages captured
      const finalTranscript = generateTestTranscript();
      await handleEndConversation(finalTranscript);
    }
  };

  const handleTestMode = () => {
    if (disabled) return;
    
    logger.testEvent('Using test mode - simulating conversation completion');
    
    // Generate a realistic test transcript and trigger story generation
    const testTranscript = generateTestTranscript();
    storeEndConversation(testTranscript);
  };

  // Generate a realistic test transcript for development/testing
  const generateTestTranscript = (): string => {
    return `User: I want a story about a dragon!

Agent: A dragon story sounds fantastic! What kind of dragon should it be? A friendly dragon, a magical dragon, or maybe a dragon with a special job?

User: A friendly dragon who helps people learn to read books

Agent: Oh, I love that idea! A dragon who helps with reading - that's so creative! Where should this helpful dragon live? In a library, a magical forest, or somewhere else special?

User: In a big library with lots and lots of books everywhere

Agent: Perfect! And who should the dragon help? Maybe some children who are learning to read?

User: Yeah! Kids who are scared to read out loud but the dragon makes them feel brave

Agent: That's such a wonderful and heartwarming idea! I think we have everything we need to create your story about a brave, helpful dragon in a magical library. Let me create that story for you now!`;
  };

  return (
    <View style={styles.container}>
      
      {/* Main Conversation Button */}
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

      {/* Active Conversation Controls */}
      {isConversationActive && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            🎙️ Having a conversation with the StoryWriter Agent!
          </Text>
          <Text style={styles.helpText}>
            The agent will automatically end the conversation when ready to create your story.
          </Text>
          <TouchableOpacity
            style={styles.endButton}
            onPress={handleManualEnd}
          >
            <Text style={styles.endButtonText}>End Conversation</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Status Display */}
      {phase === 'GENERATING' && (
        <View style={styles.processingContainer}>
          <Text style={styles.processingText}>
            ✨ Creating your story from the conversation...
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
  helpText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center' as const,
    fontStyle: 'italic' as const,
    marginBottom: 10,
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
};

export default ConversationInterface;