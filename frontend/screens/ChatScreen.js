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

// ...existing imports...

const ChatScreen = ({ route, navigation, setCurrentLoad }) => { // Add setCurrentLoad prop
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentLoads, setCurrentLoads] = useState([]);
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

  const handleVoiceMessage = async (audioUri) => {
    try {
      setIsLoading(true);
      
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
          text: result.aiResponse.text || result.aiResponse,
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
      const load = currentLoads.find(l => l.id === loadId);
      if (load) {
        setCurrentLoad(load);
        
        // Remove from available loads
        setCurrentLoads(prev => prev.filter(l => l.id !== loadId));
        
        // Add confirmation message to chat
        const confirmationMessage = {
          id: Date.now(),
          text: `✅ Load ${loadId} accepted successfully!\n\n📍 ${load.pickup} → ${load.delivery}\n💰 $${load.pay.toLocaleString()}\n📏 ${load.distance}\n⏰ ${load.pickupTime}`,
          isUser: false,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, confirmationMessage]);
        
        Alert.alert(
          'Load Accepted!', 
          `You've accepted load ${loadId}. Would you like to start navigation?`,
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Start Route', onPress: () => navigation.navigate('Route') }
          ]
        );
      }
    } catch (error) {
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
          currentLoads: currentLoads // Send current loads for context
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
      const load = currentLoads.find(l => l.id === id);
      if (load) {
        return `🚛 Load ${load.id}:\n📍 ${load.pickup} → ${load.delivery}\n💰 $${load.pay.toLocaleString()}\n📏 ${load.distance}\n⏰ ${load.pickupTime}\n🏢 ${load.broker}\n${load.urgent ? '🚨 URGENT' : ''}`;
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AutoPilot Assistant</Text>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
      >
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
    marginLeft: 8,
    color: '#666',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
});

export default ChatScreen;