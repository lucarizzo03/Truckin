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

const ChatScreen = ({ route, navigation, setCurrentLoad }) => {
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
        setCurrentLoads(result.loads);
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
      formData.append('currentLoads', JSON.stringify(currentLoads));

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
        // Add user's transcribed message
        const userMessage = {
          id: Date.now(),
          text: result.userMessage,
          isUser: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, userMessage]);

        // Add AI response
        const aiMessage = {
          id: Date.now() + 1,
          text: typeof result.aiResponse === 'object' ? result.aiResponse.text : result.aiResponse,
          isUser: false,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);

        // Execute any actions
        if (result.aiResponse.action) {
          setTimeout(() => executeAction(result.aiResponse.action), 1000);
        }
      } else {
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
    switch (action.type) {
      case 'accept_load':
        await handleLoadAcceptance(action.loadId);
        break;
      case 'navigate_to_screen':
        navigation.navigate(action.screen, action.params);
        break;
      case 'show_load_details':
        showLoadDetails(action.loadIds);
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  const handleLoadAcceptance = async (loadId) => {
    try {
      const load = currentLoads.find(l => l.id === loadId || l.load_id === loadId);
      if (load) {
        const l = load.metadata ? { ...load, ...load.metadata } : load;
        setCurrentLoad(l);
        
        // Add confirmation message to chat
        const confirmationMessage = {
          id: Date.now(),
          text: `✅ Load ${loadId} accepted successfully!\n\n📍 ${l.pickup} → ${l.delivery}\n💰 $${typeof l.pay === 'number' ? l.pay.toLocaleString() : l.pay ?? 'N/A'}\n📏 ${l.distance}\n⏰ ${l.pickupTime}`,
          isUser: false,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, confirmationMessage]);
        
        // Re-fetch loads to keep the list current
        await fetchCurrentLoads();
        
        Alert.alert(
          'Load Accepted!', 
          `You've accepted load ${loadId}. Would you like to start navigation?`,
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Start Route', onPress: () => navigation.navigate('Route') }
          ]
        );
      }
    } 
    catch (error) {
      console.error('Load acceptance error:', error);
      Alert.alert('Error', 'Failed to accept load');
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
        const aiMessage = {
          id: Date.now() + 1,
          text: result.aiResponse,
          isUser: false,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);

        // Execute any actions
        if (result.action) {
          setTimeout(() => executeAction(result.action), 1000);
        }
      }
    } catch (error) {
      console.error('Text message error:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  // Add this function after handleLoadAcceptance
  const showLoadDetails = (loadIds) => {
    const loadDetails = loadIds.map(id => {
    const load = currentLoads.find(l => l.id === id || l.load_id === id);
    if (load) {
      return `🚛 Load ${load.id}:\n📍 ${load.pickup} → ${load.delivery}\n💰 $${typeof load.pay === 'number' ? load.pay.toLocaleString() : (load.pay ?? 'N/A')}\n📏 ${load.distance}\n⏰ ${load.pickupTime}\n🏢 ${load.broker}\n${load.urgent ? '🚨 URGENT' : ''}`;
    }
    return `Load ${id} not found`;
  }).join('\n\n');

    const detailsMessage = {
      id: Date.now(),
      text: loadDetails,
      isUser: false,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, detailsMessage]);
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