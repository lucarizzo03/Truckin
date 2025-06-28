import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const HomeScreen = ({ navigation }) => {
  const [currentLoad, setCurrentLoad] = useState({
    id: 'L001',
    pickup: 'Chicago, IL',
    delivery: 'Dallas, TX',
    pay: 2800,
    eta: '2:30 PM',
    distance: '925 miles',
  });

  const [financials, setFinancials] = useState({
    today: 450,
    week: 3200,
    month: 12800,
  });

  const [notifications, setNotifications] = useState([
    { id: 1, type: 'load', message: 'New load offer: $2,100 for Chicago → Atlanta', time: '5m ago' },
    { id: 2, type: 'weather', message: 'Weather alert: Heavy rain expected on I-90', time: '15m ago' },
    { id: 3, type: 'compliance', message: 'HOS reminder: Break required in 2 hours', time: '1h ago' },
  ]);

  const handleVoiceAssistant = () => {
    Alert.alert(
      'Voice Assistant',
      'Voice assistant activated. Say "Find loads near me" or "Show my route"',
      [{ text: 'OK' }]
    );
  };

  const handleLoadAction = (action) => {
    if (action === 'accept') {
      Alert.alert('Load Accepted', 'You\'ve accepted the current load assignment.');
    } else if (action === 'decline') {
      Alert.alert('Load Declined', 'You\'ve declined the current load assignment.');
    }
  };

  const handleNotificationPress = (notification) => {
    Alert.alert('Notification', notification.message);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning, Driver!</Text>
            <Text style={styles.subtitle}>Ready to hit the road?</Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <Ionicons name="person-circle" size={40} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Current Load Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Current Load</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Active</Text>
            </View>
          </View>
          
          <View style={styles.loadInfo}>
            <View style={styles.routeInfo}>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={16} color="#007AFF" />
                <Text style={styles.locationText}>{currentLoad.pickup}</Text>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.locationRow}>
                <Ionicons name="location" size={16} color="#FF3B30" />
                <Text style={styles.locationText}>{currentLoad.delivery}</Text>
              </View>
            </View>
            
            <View style={styles.loadDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Pay:</Text>
                <Text style={styles.detailValue}>${currentLoad.pay.toLocaleString()}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>ETA:</Text>
                <Text style={styles.detailValue}>{currentLoad.eta}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Distance:</Text>
                <Text style={styles.detailValue}>{currentLoad.distance}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.loadActions}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleLoadAction('accept')}
            >
              <Text style={styles.actionButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.declineButton]}
              onPress={() => handleLoadAction('decline')}
            >
              <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Financial Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Financial Summary</Text>
          <View style={styles.financialGrid}>
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Today</Text>
              <Text style={styles.financialValue}>${financials.today}</Text>
            </View>
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>This Week</Text>
              <Text style={styles.financialValue}>${financials.week.toLocaleString()}</Text>
            </View>
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>This Month</Text>
              <Text style={styles.financialValue}>${financials.month.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notifications</Text>
          {notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={styles.notificationItem}
              onPress={() => handleNotificationPress(notification)}
            >
              <View style={styles.notificationIcon}>
                <Ionicons 
                  name={
                    notification.type === 'load' ? 'truck' :
                    notification.type === 'weather' ? 'cloudy' : 'time'
                  } 
                  size={20} 
                  color="#007AFF" 
                />
              </View>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationText}>{notification.message}</Text>
                <Text style={styles.notificationTime}>{notification.time}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Voice Assistant Button */}
      <TouchableOpacity style={styles.voiceButton} onPress={handleVoiceAssistant}>
        <Ionicons name="mic" size={32} color="white" />
      </TouchableOpacity>
    </View>
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
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 2,
  },
  profileButton: {
    padding: 4,
  },
  card: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  statusBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  loadInfo: {
    marginBottom: 16,
  },
  routeInfo: {
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  locationText: {
    fontSize: 16,
    marginLeft: 8,
    color: '#1a1a1a',
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#ddd',
    marginLeft: 7,
    marginVertical: 4,
  },
  loadDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  loadActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  declineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  financialGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  financialItem: {
    alignItems: 'center',
    flex: 1,
  },
  financialLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  financialValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 2,
  },
  notificationTime: {
    fontSize: 12,
    color: '#666',
  },
  voiceButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default HomeScreen; 