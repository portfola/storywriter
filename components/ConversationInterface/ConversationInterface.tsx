import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import ElevenLabsService from '@/services/elevenLabsService';
import { ConversationSession, ConversationMessage } from '@/types/elevenlabs';
import { useConversationStore } from '@/src/stores/conversationStore';

// Fallback function to detect when the agent is signaling conversation end via text patterns
// Primary method should be the agent calling an end_call tool via client_tool_call message
// 
// TO CONFIGURE: In your ElevenLabs agent, add a client tool called "end_call" or "end_conversation"
// with the following configuration:
// - Tool Name: "end_call" or "end_conversation" 
// - Description: "Call this tool when you want to end the conversation and proceed to story generation"
// - Parameters: {} (no parameters needed)
const detectConversationEnd = (agentText: string): boolean => {
  const lowercaseText = agentText.toLowerCase();
  console.log('🔍 Analyzing agent message for end patterns:', agentText);
  
  // Story processing/creation keywords (broader matching)
  const storyKeywords = [
    'story', 'stories', 'tale', 'narrative', 'book'
  ];
  
  // Action verbs that indicate story creation/processing
  const creationVerbs = [
    'create', 'creating', 'generate', 'generating', 'write', 'writing',
    'craft', 'crafting', 'make', 'making', 'build', 'building',
    'work on', 'working on', 'process', 'processing', 'develop', 'developing'
  ];
  
  // Processing/system references (like "story machine")
  const systemReferences = [
    'machine', 'system', 'generator', 'creator', 'engine',
    'processor', 'builder', 'maker', 'program'
  ];
  
  // Transition phrases that indicate moving to next step
  const transitionPhrases = [
    'i\'m going to', 'i\'ll go ahead and', 'let me', 'i\'ll', 'time to',
    'ready to', 'going to', 'about to', 'now i\'ll', 'i\'m going to go ahead',
    'enter this into', 'put this into', 'send this to', 'input this'
  ];
  
  // Farewell patterns (polite endings)
  const farewellPatterns = [
    'have fun', 'have a great', 'have a wonderful', 'have a nice',
    'enjoy', 'thanks for', 'thank you for', 'goodbye', 'bye',
    'talk to you later', 'see you later', 'until next time', 'take care',
    'chat soon', 'speak soon'
  ];
  
  // High-confidence patterns (exact phrases we've seen)
  const exactPatterns = [
    'create that story now',
    'story machine',
    'story generator',
    'story creation',
    'story generation',
    'enter this into the story',
    'put this into the story',
    'going to create your story',
    'time to create',
    'ready to create'
  ];
  
  // Check for exact patterns first
  if (exactPatterns.some(pattern => lowercaseText.includes(pattern))) {
    console.log('✅ EXACT PATTERN MATCH FOUND!');
    return true;
  }
  
  // Check for combinations that indicate story processing
  const hasStoryKeyword = storyKeywords.some(keyword => lowercaseText.includes(keyword));
  const hasCreationVerb = creationVerbs.some(verb => lowercaseText.includes(verb));
  const hasSystemRef = systemReferences.some(ref => lowercaseText.includes(ref));
  const hasTransition = transitionPhrases.some(phrase => lowercaseText.includes(phrase));
  const hasFarewell = farewellPatterns.some(pattern => lowercaseText.includes(pattern));
  
  console.log('📊 Pattern analysis:', {
    hasStoryKeyword,
    hasCreationVerb,
    hasSystemRef,
    hasTransition,
    hasFarewell
  });
  
  // Advanced pattern matching
  // Pattern 1: Transition + Story + (Creation OR System)
  if (hasTransition && hasStoryKeyword && (hasCreationVerb || hasSystemRef)) {
    console.log('✅ PATTERN 1 MATCH: Transition + Story + (Creation OR System)');
    return true;
  }
  
  // Pattern 2: "enter/put this into" + story-related
  if ((lowercaseText.includes('enter this') || lowercaseText.includes('put this')) && hasStoryKeyword) {
    console.log('✅ PATTERN 2 MATCH: Enter/Put + Story');
    return true;
  }
  
  // Pattern 3: Farewell + story context (like "have fun" with story mention)
  if (hasFarewell && hasStoryKeyword) {
    console.log('✅ PATTERN 3 MATCH: Farewell + Story');
    return true;
  }
  
  // Pattern 4: System reference + story processing
  if (hasSystemRef && hasStoryKeyword && (hasCreationVerb || hasTransition)) {
    console.log('✅ PATTERN 4 MATCH: System + Story + (Creation OR Transition)');
    return true;
  }
  
  console.log('❌ No end pattern detected');
  return false;
};

interface Props {
  onConversationComplete: (transcript: string) => void;
  disabled?: boolean;
}

const ConversationInterface: React.FC<Props> = ({ onConversationComplete, disabled = false }) => {
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
    setError
  } = useConversationStore();
  
  const isConversationActive = phase === 'CONVERSATION_ACTIVE';

  // Auto-trigger onConversationComplete when transcript is ready
  useEffect(() => {
    if (normalizedTranscript && phase === 'STORY_GENERATING') {
      onConversationComplete(normalizedTranscript);
    }
  }, [normalizedTranscript, phase, onConversationComplete]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Clean up timeout
      if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
      }
      
      // Clean up conversation
      if (conversationSession) {
        console.log('🧹 Component unmounting - cleaning up conversation session');
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
          console.log('✅ Connected to StoryWriter Agent');
          setIsConnecting(false);
        },
        
        onDisconnect: () => {
          console.log('❌ Disconnected from StoryWriter Agent - ending conversation');
          setConversationSession(null);
          
          // Auto-end conversation when disconnected (only if currently active)
          endConversation();
        },
        
        onMessage: (message: ConversationMessage) => {
          console.log('💬 Message received:', message);
          
          // Handle different message types
          switch (message.type) {
            case 'user_transcript':
            case 'user_message':
              const userText = message.user_transcription_event?.user_transcript || 
                              message.text || message.content || '';
              if (userText.trim()) {
                console.log('👤 User:', userText);
                console.log('📝 Adding user message to transcript at:', new Date().toISOString());
                addDialogueTurn('user', userText);
              }
              break;
              
            case 'agent_response':
            case 'agent_message':
              const agentText = message.agent_response_event?.agent_response ||
                              message.text || message.content || '';
              if (agentText.trim()) {
                console.log('🤖 Agent:', agentText);
                console.log('📝 Adding agent response to transcript at:', new Date().toISOString());
                addDialogueTurn('agent', agentText);
                setLastAgentMessage(Date.now());
                
                // Clear any existing inactivity timeout
                if (inactivityTimeout) {
                  clearTimeout(inactivityTimeout);
                  setInactivityTimeout(null);
                }
                
                // Fallback: Intelligent conversation end detection based on agent closing statements
                if (detectConversationEnd(agentText)) {
                  console.log('🔚 FALLBACK: Pattern-based conversation end detected!');
                  console.log('📝 Agent message that triggered end:', agentText);
                  console.log('⏰ Auto-ending conversation in 2 seconds...');
                  setTimeout(() => {
                    handleEndConversation();
                  }, 2000); // Give 2 seconds for the agent to finish speaking
                } else {
                  // Set inactivity timeout as backup (30 seconds after last agent message)
                  const timeout = setTimeout(() => {
                    console.log('⏰ Conversation inactivity timeout - auto-ending conversation');
                    handleEndConversation();
                  }, 30000);
                  setInactivityTimeout(timeout);
                }
              }
              break;
              
            case 'client_tool_call':
              const toolCall = message.client_tool_call;
              console.log('🔧 Tool call received from agent:', toolCall);
              
              // Handle end conversation tool call
              if (toolCall && (toolCall.tool_name === 'end_conversation' || toolCall.tool_name === 'end_call')) {
                console.log('🔚 AGENT CALLED END TOOL:', toolCall.tool_name);
                console.log('📝 Tool call parameters:', toolCall.parameters);
                console.log('⏰ Ending conversation immediately...');
                
                // Clear any existing timeout
                if (inactivityTimeout) {
                  clearTimeout(inactivityTimeout);
                  setInactivityTimeout(null);
                }
                
                // End conversation immediately when agent calls the end tool
                handleEndConversation();
              } else if (toolCall) {
                // Handle other potential tool calls
                console.log('🔧 Other tool call:', toolCall.tool_name, toolCall.parameters);
                // You can extend this to handle other tools your agent might call
              }
              break;
              
            case 'audio':
              // Handle audio messages if needed
              console.log('🔊 Audio message received');
              break;
              
            case 'ping':
              // Handle ping messages if needed
              console.log('🏓 Ping message received');
              break;
              
            default:
              // Capture any other message types for comprehensive logging
              console.log('📋 Other message type received:', message.type, message);
          }
        },
        
        onError: (error) => {
          console.error('❌ Conversation error:', error);
          setIsConnecting(false);
          setConversationSession(null);
          setError('Failed to connect to the StoryWriter Agent. Please try again or use the test button.');
          
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
        console.error('❌ Error ending conversation:', error);
      }
    }
    
    setConversationSession(null);
    endConversation(); // Use store's endConversation method
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