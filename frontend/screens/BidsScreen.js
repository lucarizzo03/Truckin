import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';

const BidsScreen = ({ navigation, setCurrentLoad }) => {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBids = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:2300/api/bids');
      const data = await res.json();
      if (data.success && Array.isArray(data.bids)) {
        setBids(data.bids);
      }
    } catch (err) {
      // handle error
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBids();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBids().then(() => setRefreshing(false));
  };

  const acceptBid = (bid) => {
    setCurrentLoad && setCurrentLoad(bid);
    setBids(prev => prev.filter(b => b.id !== bid.id));
    navigation.navigate('Home');
  };

  // You may want to filter active bids differently depending on your schema
  const activeBids = bids.filter(bid => !bid.status || bid.status === 'active_bid');

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Your Active Bids</Text>
      {loading && <Text style={{ textAlign: 'center', marginTop: 40, color: '#888' }}>Loading bids...</Text>}
      {!loading && activeBids.length === 0 && (
        <Text style={{ textAlign: 'center', marginTop: 40, color: '#888' }}>
          No active bids yet.
        </Text>
      )}
      {activeBids.map(bid => (
        <View key={bid.id || bid.load_id} style={styles.bidCard}>
          <Text style={styles.bidTitle}>Load ID: {bid.load_id}</Text>
          <Text style={styles.bidAmount}>Bid Amount: ${bid.bid_amount}</Text>
          <Text style={{ marginBottom: 8 }}>{bid.confirmation}</Text>
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