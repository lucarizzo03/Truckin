import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

const HomeScreen = ({ navigation, currentLoad, setCurrentLoad, invoices, addInvoice, expenses = [] }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);

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
      
      // Navigate to ChatScreen immediately
      navigation.navigate('Chat', { voiceMessageUri: uri });
      
      setRecording(null);
    } catch (err) {
      console.error('Failed to stop recording', err);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const handleEndLoad = () => {
    Alert.alert(
      'End Trip',
      'Are you sure you want to end this trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'End Trip', 
          style: 'destructive', 
          onPress: () => {
            if (currentLoad && addInvoice) {
              addInvoice({
                id: Date.now().toString(),
                loadId: currentLoad.id,
                amount: currentLoad.pay,
                status: 'pending',
                date: new Date().toISOString(),
                broker: currentLoad.broker,
              });
            }
            setCurrentLoad(null);
          }
        },
      ]
    );
  };

  // Helper to check if a date is in this week
  const isThisWeek = (dateString) => {
    const now = new Date();
    const d = new Date(dateString);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0,0,0,0);
    return d >= startOfWeek && d <= now;
  };
  
  // Filter paid invoices and expenses for this week
  const weeklyPaidInvoices = (invoices || []).filter(inv => inv.status === 'paid' && isThisWeek(inv.date));
  const weeklyExpenses = (expenses || []).filter(exp => isThisWeek(exp.date));

  
 // Calculate totals
  const weeklyIncome = weeklyPaidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const weeklyExpensesTotal = weeklyExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const weeklyNetIncome = weeklyIncome - weeklyExpensesTotal;

  

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>AutoPilot</Text>
      <Text style={styles.subtitle}>Welcome back, driver!</Text>

      {/* Current Load Info */}
      <View style={styles.currentLoadCard}>
        {currentLoad ? (
          <>
            {/* Header with status */}
            <View style={styles.cardHeader}>
              <View style={styles.statusContainer}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Active Trip</Text>
              </View>
              <TouchableOpacity 
                style={styles.endTripButton} 
                onPress={handleEndLoad}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={18} color="white" />
                <Text style={styles.endTripButtonText}>End Trip</Text>
              </TouchableOpacity>
            </View>

            {/* Route visualization */}
            <View style={styles.routeContainer}>
              <View style={styles.routeVisual}>
                <View style={styles.pickupDot} />
                <View style={styles.routeLine} />
                <View style={styles.deliveryDot} />
              </View>
              <View style={styles.routeTexts}>
                <Text style={styles.pickupLabel}>PICKUP</Text>
                <Text style={styles.pickupAddress}>{currentLoad.pickup}</Text>
                <View style={styles.routeSpacer} />
                <Text style={styles.deliveryLabel}>DELIVERY</Text>
                <Text style={styles.deliveryAddress}>{currentLoad.delivery}</Text>
              </View>
            </View>

            {/* Trip details */}
            <View style={styles.tripDetails}>
              {currentLoad.equipment && (
                <View style={styles.detailItem}>
                  <Ionicons name="car" size={20} color="#007AFF" />
                  <Text style={styles.detailLabel}>Equipment</Text>
                  <Text style={styles.detailValue}>{currentLoad.equipment}</Text>
                </View>
              )}
              {currentLoad.rate && (
                <View style={styles.detailItem}>
                  <Ionicons name="cash" size={20} color="#34C759" />
                  <Text style={styles.detailLabel}>Rate</Text>
                  <Text style={styles.detailValue}>${currentLoad.rate}</Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={styles.noTripContainer}>
            <Ionicons name="car-outline" size={48} color="#C7C7CC" />
            <Text style={styles.noTripTitle}>No Active Trip</Text>
            <Text style={styles.noTripSubtitle}>Start a new load to begin your journey</Text>
          </View>
        )}
      </View>

      {/* Voice Button */}
      <TouchableOpacity
        style={[styles.voiceButton, isRecording && styles.voiceButtonActive]}
        onPress={isRecording ? stopRecording : startRecording}
        activeOpacity={0.8}
      >
        <Ionicons 
          name={isRecording ? "stop" : "mic"} 
          size={32} 
          color="white" 
        />
        <Text style={styles.voiceButtonText}>
          {isRecording ? "Tap to Send" : "Ask AutoPilot"}
        </Text>
      </TouchableOpacity>



      {/* Financial Summary */}
      <View style={styles.financeSummaryTile}>
        <Ionicons name="bar-chart" size={32} color="#007AFF" style={{ marginBottom: 10 }} />
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#222', marginBottom: 4, textAlign: 'center' }}>
          Income this week
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 2 }}>
          <Text style={{
            fontSize: 36,
            fontWeight: 'bold',
            color: '#34C759',
            textAlign: 'center',
            marginTop: 18,
            lineHeight: 40,
          }}>
            ${weeklyNetIncome.toLocaleString()}
          </Text>
          <Text style={{
            color: '#888',
            fontWeight: 'normal',
            fontSize: 18,
            marginLeft: 6,
            marginBottom: 4,
          }}>
          </Text>
        </View>
        <Text style={{ color: '#888', fontSize: 14, marginTop: 6, textAlign: 'center' }}>
        </Text>
        <Text style={{ color: '#007AFF', fontSize: 14, fontWeight: '600', marginTop: 8, textAlign: 'center' }}>
        </Text>
      </View>
          
      



      {/* Notifications Section */}
      <View style={styles.notificationsSection}>
        <Text style={styles.notificationsTitle}>Notifications</Text>
        {/*
          This section is ready for dynamic notifications.
          You can map over an array of notification objects, e.g.:
          notifications.map((n, i) => (
            <Text key={i} style={styles.notificationItem}>{n.icon} {n.text}</Text>
          ))
        */}
        {/* Example static fallback if no notifications */}
        <Text style={styles.notificationItem}>No notifications yet. Weather, tips, and alerts will appear here.</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 50,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
  },
  currentLoadCard: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6fbe8',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
    marginRight: 5,
  },
  statusText: {
    color: '#22c55e',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  endTripButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  endTripButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 5,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  routeVisual: {
    flexDirection: 'column',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 4,
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34C759',
    marginBottom: 8,
  },
  routeLine: {
    width: 2,
    height: 40,
    backgroundColor: '#E5E5EA',
    marginVertical: 4,
  },
  deliveryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
    marginTop: 8,
  },
  routeTexts: {
    flex: 1,
  },
  pickupLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  pickupAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
    lineHeight: 20,
  },
  routeSpacer: {
    height: 16,
  },
  deliveryLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  deliveryAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    lineHeight: 20,
  },
  tripDetails: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 12,
    flex: 1,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  noTripContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noTripTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
  },
  noTripSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  voiceButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    marginVertical: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  voiceButtonActive: {
    backgroundColor: '#FF3B30',
  },
  voiceButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  actionButton: {
    alignItems: 'center',
    padding: 15,
  },
  actionText: {
    color: '#007AFF',
    fontSize: 14,
    marginTop: 5,
  },
  notificationsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 30,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  notificationsTitle: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#333',
    marginBottom: 8,
  },
  notificationItem: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
    },
    financeSummaryTile: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 24,
    marginBottom: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 6,
  },
});
 
export default HomeScreen;