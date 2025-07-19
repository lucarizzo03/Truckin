import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

const BidsScreen = ({ navigation, bids, setCurrentLoad, setBids }) => {
  const activeBids = bids.filter(bid => bid.status === 'active_bid');

  const acceptBid = (bid) => {
    setCurrentLoad(bid);
    setBids(prev => prev.filter(b => b.id !== bid.id));
    navigation.navigate('Home');
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Your Active Bids</Text>
      {activeBids.length === 0 && (
        <Text style={{ textAlign: 'center', marginTop: 40, color: '#888' }}>
          No active bids yet.
        </Text>
      )}
      {activeBids.map(bid => (
        <View key={bid.id} style={styles.bidCard}>
          <Text style={styles.bidTitle}>{bid.pickup} → {bid.delivery}</Text>
          <Text style={styles.bidAmount}>Bid Amount: ${bid.bidAmount}</Text>
          <TouchableOpacity style={styles.acceptButton} onPress={() => acceptBid(bid)}>
            <Text style={styles.acceptText}>Accept Bid</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  bidCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#007AFF',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  bidTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  bidAmount: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 12,
  },
  acceptButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  acceptText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default BidsScreen;