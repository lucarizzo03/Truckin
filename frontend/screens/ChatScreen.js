import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ChatScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      text: 'Hello! I\'m your trucking assistant. How can I help you today?',
      timestamp: '9:00 AM',
    },
    {
      id: 2,
      type: 'user',
      text: 'Find loads near me paying over $1.5k',
      timestamp: '9:01 AM',
    },
    {
      id: 3,
      type: 'assistant',
      text: 'I found 3 loads near your current location:\n\n• Chicago → Dallas: $2,800 (925 miles)\n• Chicago → Atlanta: $2,100 (665 miles)\n• Chicago → Miami: $1,800 (1,380 miles)\n\nWould you like me to show you more details about any of these?',
      timestamp: '9:01 AM',
    },
    {
      id: 4,
      type: 'user',
      text: 'Show me the first one',
      timestamp: '9:02 AM',
    },
    {
      id: 5,
      type: 'assistant',
      text: 'Load Details:\n\nPickup: Chicago, IL\nDelivery: Dallas, TX\nPay: $2,800\nDistance: 925 miles\nPickup Time: Today 2:00 PM\nEquipment: 53\' Dry Van\nBroker: ABC Logistics\n\nThis load is marked as urgent. Would you like to accept it?',
      timestamp: '9:02 AM',
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const flatListRef = useRef(null);

  const quickCommands = [
    'Find loads near me',
    'Show my route',
    'Add fuel expense',
    'Check HOS status',
    'Find rest areas',
    'Weather update',
  ];

  const handleSendMessage = () => {
    if (inputText.trim()) {
      const newMessage = {
        id: Date.now(),
        type: 'user',
        text: inputText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      
      setMessages([...messages, newMessage]);
      setInputText('');
      
      // Simulate assistant response
      setTimeout(() => {
        const assistantResponse = {
          id: Date.now() + 1,
          type: 'assistant',
          text: getAssistantResponse(inputText),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, assistantResponse]);
      }, 1000);
    }
  };

  const getAssistantResponse = (userInput) => {
    const input = userInput.toLowerCase();
    
    if (input.includes('load') && input.includes('near')) {
      return 'I found 5 loads within 50 miles of your current location. The highest paying is $2,800 for Chicago to Dallas. Would you like me to show you the details?';
    } else if (input.includes('route') || input.includes('eta')) {
      return 'Your current route from Chicago to Dallas:\n\nETA: 2:30 PM\nDistance: 925 miles\nDuration: 14h 30m\n\nNext stop: Fuel in Springfield, IL (10:30 AM)';
    } else if (input.includes('fuel') && input.includes('expense')) {
      return 'I can help you log a fuel expense. How much did you spend on fuel?';
    } else if (input.includes('hos') || input.includes('hours')) {
      return 'Your Hours of Service status:\n\nDriving time: 6h 15m\nRemaining driving time: 5h 45m\nNext break required: 2h 15m\n\nYou\'re in compliance with current regulations.';
    } else if (input.includes('rest') || input.includes('sleep')) {
      return 'I found 3 rest areas within the next 50 miles:\n\n• Pilot Travel Center (Springfield, IL) - 15 miles\n• TA Travel Center (St. Louis, MO) - 35 miles\n• Love\'s Travel Stop (Little Rock, AR) - 45 miles';
    } else if (input.includes('weather')) {
      return 'Current weather along your route:\n\nChicago: 45°F, Partly Cloudy\nSpringfield: 48°F, Clear\nSt. Louis: 52°F, Clear\nLittle Rock: 58°F, Sunny\nDallas: 62°F, Sunny\n\nNo weather alerts for your route.';
    } else {
      return 'I\'m here to help with loads, routes, expenses, HOS tracking, and more. Try asking me to find loads, show your route, or add an expense.';
    }
  };

  const handleVoiceCommand = () => {
    setIsListening(true);
    Alert.alert(
      'Voice Assistant',
      'Listening... Say your command clearly.',
      [
        {
          text: 'Stop',
          onPress: () => setIsListening(false),
          style: 'cancel',
        },
        {
          text: 'Demo Response',
          onPress: () => {
            setIsListening(false);
            const demoText = 'Find loads near me paying over $2k';
            setInputText(demoText);
            setTimeout(() => handleSendMessage(), 500);
          },
        },
      ]
    );
  };

  const handleQuickCommand = (command) => {
    setInputText(command);
    setTimeout(() => handleSendMessage(), 500);
  };

  const renderMessage = ({ item }) => (
    <View style={[
      styles.messageContainer,
      item.type === 'user' ? styles.userMessage : styles.assistantMessage
    ]}>
      <View style={[
        styles.messageBubble,
        item.type === 'user' ? styles.userBubble : styles.assistantBubble
      ]}>
        <Text style={[
          styles.messageText,
          item.type === 'user' ? styles.userText : styles.assistantText
        ]}>
          {item.text}
        </Text>
        <Text style={styles.timestamp}>{item.timestamp}</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Voice Assistant</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="settings" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Quick Commands */}
      <View style={styles.quickCommandsContainer}>
        <Text style={styles.sectionTitle}>Quick Commands</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={quickCommands}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.quickCommandButton}
              onPress={() => handleQuickCommand(item)}
            >
              <Text style={styles.quickCommandText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMessage}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder="Type your message or use voice..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={styles.voiceButton} 
            onPress={handleVoiceCommand}
          >
            <Ionicons 
              name={isListening ? "mic" : "mic-outline"} 
              size={24} 
              color={isListening ? "#FF3B30" : "#007AFF"} 
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]} 
          onPress={handleSendMessage}
          disabled={!inputText.trim()}
        >
          <Ionicons name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  settingsButton: {
    padding: 8,
  },
  quickCommandsContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  quickCommandButton: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  quickCommandText: {
    fontSize: 14,
    color: '#666',
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  assistantMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 16,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  userText: {
    color: 'white',
  },
  assistantText: {
    color: '#1a1a1a',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f8f9fa',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
  },
  voiceButton: {
    padding: 8,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
});

export default ChatScreen; 