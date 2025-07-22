import React from 'react';
import { WebView } from 'react-native-webview';
import { View, StyleSheet } from 'react-native';

interface Props {
  onConversationComplete?: (transcript: string) => void;
}

const ElevenLabsWidget: React.FC<Props> = ({ onConversationComplete }) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                margin: 0;
                padding: 20px;
                font-family: Arial, sans-serif;
                background-color: #f0f8ff;
            }
            elevenlabs-convai {
                width: 100%;
                height: 400px;
            }
        </style>
    </head>
    <body>
        <elevenlabs-convai agent-id="agent_01jxvakybhfmnr3yqvwxwye3sj"></elevenlabs-convai>
        <script src="https://unpkg.com/@elevenlabs/convai-widget-embed" async type="text/javascript"></script>
        
        <script>
            // Listen for conversation events (if the widget provides them)
            window.addEventListener('message', function(event) {
                if (event.data.type === 'elevenlabs_conversation_complete') {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'conversation_complete',
                        transcript: event.data.transcript
                    }));
                }
            });
        </script>
    </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'conversation_complete' && onConversationComplete) {
        onConversationComplete(data.transcript || "I want to create a story");
      }
    } catch (error) {
      console.error('Error parsing widget message:', error);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: htmlContent }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 400,
    backgroundColor: '#f0f8ff',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default ElevenLabsWidget;