import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

const ChatScreen = ({ route, navigation, bids, setBids }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentLoads, setCurrentLoads] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const scrollViewRef = useRef();

  // Fetch current loads when component mounts
  useEffect(() => {
    fetchCurrentLoads();
  }, []);

  // Handle voice message from HomeScreen
  useEffect(() => {
    if (route.params?.voiceMessageUri) {
      handleVoiceMessage(route.params.voiceMessageUri);
      // Clear the parameter to prevent re-processing
      navigation.setParams({ voiceMessageUri: null });
    }
  }, [route.params?.voiceMessageUri]);

  const fetchCurrentLoads = async () => {
    try {
      const response = await fetch('http://localhost:2300/api/loads');
      const result = await response.json();
      if (result.success) {
        setCurrentLoads(result.loads.map(l => ({
          ...l,
          id: l.id || l.load_id
        })));
      }
    } catch (error) {
      console.error('Failed to fetch loads:', error);
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow microphone access');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      // Process the voice message
      await handleVoiceMessage(uri);
      
      setRecording(null);
    } catch (err) {
      console.error('Failed to stop recording', err);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const handleVoiceMessage = async (audioUri) => {
    try {
      setIsLoading(true);

      // Always fetch fresh loads before processing voice message
      await fetchCurrentLoads();

      // Create form data for file upload
      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'voice-message.m4a'
      });
      formData.append('history', JSON.stringify(messages.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text
      }))));

      // Send voice message to backend
      const response = await fetch('http://localhost:2300/api/voice-to-chat', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = await response.json();

      if (result.success) {
        // Filter out function_call markers from AI response text
        let aiText = typeof result.aiResponse === 'object' ? result.aiResponse.text : result.aiResponse;
        if (typeof aiText === 'string') {
          aiText = aiText.replace(/function_call: \w+/gi, '').trim();
        }
        const userMessage = {
          id: Date.now(),
          text: aiText,
          isUser: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, userMessage]);

        // Add AI response (filtered as well)
        const aiMessageText = typeof result.aiResponse === 'object' ? result.aiResponse.text : result.aiResponse;
        const filteredAiMessageText = typeof aiMessageText === 'string'
          ? aiMessageText.replace(/function_call: \w+/gi, '').trim()
          : aiMessageText;

        const aiMessage = {
          id: Date.now() + 1,
          text: filteredAiMessageText,
          isUser: false,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);

        // Execute any actions
        if (result.action) {
          setTimeout(() => executeAction(result.action), 1000);
        }
      } 
      else {
        Alert.alert('Error', result.error || 'Failed to process voice message');
      }
    } catch (error) {
      console.error('Voice message error:', error);
      Alert.alert('Error', 'Failed to process voice message');
    } finally {
      setIsLoading(false);
    }
  };

  const executeAction = async (action) => {
    const loads = await fetchCurrentLoads()
    switch (action.type) {
      case 'navigate_to_screen':
        navigation.navigate(action.screen, action.params);
        break;
      case 'show_load_details':
        showLoadDetails(action.loadIds);
        break;

        
      case 'make_bid':
        const load = loads.find(l => String(l.id) === String(action.loadId));


        // console.log('Bid Action:', action);
        // console.log('Matched Load:', load);

       
        
        setBids(prev => [
          ...prev,
          {
            id: load ? load.id : action.loadId, 
            pickup: load ? load.pickup : action.pickup || 'Unknown',
            delivery: load ? load.delivery : action.delivery || 'Unknown',
            bidAmount: action.bidAmount,
            status: 'active_bid',
          }
        ]);

        Alert.alert(
          'Bid placed!',
          `Bid for $${action.bidAmount} on load ${load ? load.id : action.loadId} sent to Bids screen.`
        );

        if (action.next && action.next.type === 'navigate_to_screen') {
          navigation.navigate(action.next.screen);
        }
        break;

      default:
        console.log('Unknown action:', action);
    }
  };

  const sendTextMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputText,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Always fetch fresh loads before sending message to ensure AI has current data
      await fetchCurrentLoads();

      const response = await fetch('http://localhost:2300/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: inputText,
          history: messages.map(msg => ({
            role: msg.isUser ? 'user' : 'assistant',
            content: msg.text
          })),
        })
      });

      const result = await response.json();

      if (result.success) {
        let aiText = result.aiResponse;
        if (typeof aiText === 'string') {
          aiText = aiText.replace(/function_call: \w+/gi, '').trim();
        }
        // Always show the confirmation message for make_bid if present
        let confirmationMessage = null;
        if (result.action?.type === "make_bid" && result.action.confirmation) {
          confirmationMessage = {
            id: Date.now() + 2,
            text: result.action.confirmation,
            isUser: false,
            timestamp: new Date()
          };
        }
        const aiMessage = {
          id: Date.now() + 1,
          text: aiText,
          isUser: false,
          timestamp: new Date()
        };
        setMessages(prev => confirmationMessage ? [...prev, aiMessage, confirmationMessage] : [...prev, aiMessage]);

        // Debug: Log the action object
        console.log('AI result.action:', result.action);

        // Handle make_bid action (set bids and navigate)
        if (result.action?.type === "make_bid") {
          if (result.toolResult?.success && Array.isArray(result.toolResult.bids)) {
            setBids([...result.toolResult.bids]); // force new array reference
          } else {
            // Fallback: always append the bid to the list using action data, force new array
            setBids(prev => [
              ...prev.map(bid => ({ ...bid })),
              {
                id: result.action.loadId,
                pickup: result.action.pickup || 'Unknown',
                delivery: result.action.delivery || 'Unknown',
                bidAmount: result.action.bidAmount,
                status: 'active_bid',
              }
            ]);
          }
          setTimeout(() => navigation.navigate('Bids'), 100);
        }

        // Execute any actions except make_bid (already handled above)
        if (result.action && result.action.type !== "make_bid") {
          console.log('Executing action:', result.action);
          setTimeout(() => executeAction(result.action), 100);
        }

        // Alert if no action was found
        if (!result.action) {
          Alert.alert('No action returned', 'The AI did not return an action.');
        }
      } else {
        Alert.alert('Backend error', result.error || 'No success from backend.');
      }
    } catch (error) {
      console.error('Text message error:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <View style={styles.container}>
      {/* Header: App title */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AutoPilot Assistant</Text>
      </View>

      {/* Messages ScrollView: Shows chat history */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
      >
        {/* Render each chat message */}
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageBubble,
              message.isUser ? styles.userMessage : styles.aiMessage
            ]}
          >
            <Text style={[
              styles.messageText,
              message.isUser ? styles.userMessageText : styles.aiMessageText
            ]}>
              {message.text}
            </Text>
            {message.isProcessing && (
              <ActivityIndicator size="small" color="#666" style={{ marginTop: 5 }} />
            )}
          </View>
        ))}
        {isLoading && (
          <View style={styles.typingIndicator}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.typingText}>AutoPilot is typing...</Text>
          </View>
        )}
      </ScrollView>

      {/* Input area: Text input and send button */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={sendTextMessage}
          disabled={!inputText.trim() || isLoading}
        >
          <Ionicons name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Floating Voice Button: mic/stop button for voice input */}
      <TouchableOpacity
        style={[styles.voiceButton, isRecording && styles.voiceButtonActive]}
        onPress={isRecording ? stopRecording : startRecording}
        activeOpacity={0.8}
      >
        <Ionicons 
          name={isRecording ? "stop" : "mic"} 
          size={28} 
          color="white" 
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 15,
    paddingTop: 50,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  messagesContainer: {
    flex: 1,
    padding: 15,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
    marginVertical: 4,
  },
  userMessage: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  aiMessage: {
    backgroundColor: 'white',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: 'white',
  },
  aiMessageText: {
    color: '#333',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  typingText: {
    color: '#007AFF',
    marginLeft: 8,
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderColor: '#e0e0e0',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#b0c4de',
  },
  voiceButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    backgroundColor: '#007AFF',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  voiceButtonActive: {
    backgroundColor: '#FF3B30',
  },
});

export default ChatScreen;