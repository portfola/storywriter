import { ElevenLabs } from '@elevenlabs/elevenlabs-js';
import Constants from 'expo-constants';

const ELEVENLABS_API_KEY = Constants.expoConfig?.extra?.ELEVENLABS_API_KEY;

class ElevenLabsService {
  private client: any;
  private agentId: string;

  constructor() {
    this.client = new ElevenLabs({
      apiKey: ELEVENLABS_API_KEY,
    });
    this.agentId = "agent_01jxvakybhfmnr3yqvwxwye3sj";
  }

  async startConversation(onTranscriptComplete: (transcript: string) => void) {
    try {
      // Start conversation with your agent
      const conversation = await this.client.conversationalAi.startConversation({
        agent_id: "agent_01jxvakybhfmnr3yqvwxwye3sj", // "StoryWriter Agent" from ElevenLabs dashboard
      });

      // Connect to WebSocket for real-time communication
      this.ws = new WebSocket(conversation.websocket_url);
      
      this.ws.onopen = () => {
        console.log('Connected to ElevenLabs conversation');
        // Send initial message to start the conversation
        // this.sendMessage("Hello! I'd like to create a story.");
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'conversation_ended') {
          // Extract the full conversation transcript
          const transcript = this.extractTranscript(data.conversation_history);
          onTranscriptComplete(transcript);
          this.closeConnection();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to start conversation:', error);
      // Fallback to mock for now
      setTimeout(() => {
        onTranscriptComplete("I want a story about a brave dragon who helps children learn to read");
      }, 3000);
    }
  }

  private sendMessage(message: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'user_message',
        message: message
      }));
    }
  }

  private extractTranscript(conversationHistory: any[]): string {
    // Extract user responses from conversation history
    return conversationHistory
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .join(' ');
  }

  private closeConnection() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export default new ElevenLabsService();