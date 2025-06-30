import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const LoadsScreen = ({ navigation, setCurrentLoad }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [loads, setLoads] = useState([
    {
      id: 'L001',
      pickup: 'Chicago, IL',
      delivery: 'Dallas, TX',
      pay: 2800,
      distance: '925 miles',
      pickupTime: 'Today 2:00 PM',
      loadType: 'Dry Van',
      equipment: '53\' Dry Van',
      broker: 'ABC Logistics',
      urgent: true,
    },
    {
      id: 'L002',
      pickup: 'Atlanta, GA',
      delivery: 'Miami, FL',
      pay: 2100,
      distance: '665 miles',
      pickupTime: 'Tomorrow 8:00 AM',
      loadType: 'Reefer',
      equipment: '53\' Reefer',
      broker: 'XYZ Transport',
      urgent: false,
    },
    {
      id: 'L003',
      pickup: 'Los Angeles, CA',
      delivery: 'Phoenix, AZ',
      pay: 1800,
      distance: '372 miles',
      pickupTime: 'Today 6:00 PM',
      loadType: 'Flatbed',
      equipment: '48\' Flatbed',
      broker: 'West Coast Freight',
      urgent: true,
    },
    {
      id: 'L004',
      pickup: 'Seattle, WA',
      delivery: 'Portland, OR',
      pay: 1200,
      distance: '173 miles',
      pickupTime: 'Tomorrow 10:00 AM',
      loadType: 'Dry Van',
      equipment: '53\' Dry Van',
      broker: 'Pacific Hauling',
      urgent: false,
    },
  ]);

  const filters = [
    { key: 'all', label: 'All Loads' },
    { key: 'high-pay', label: 'High Pay' },
    { key: 'nearby', label: 'Nearby' },
    { key: 'urgent', label: 'Urgent' },
  ];

  const filteredLoads = loads.filter(load => {
    const matchesSearch = 
      load.pickup.toLowerCase().includes(searchQuery.toLowerCase()) ||
      load.delivery.toLowerCase().includes(searchQuery.toLowerCase()) ||
      load.broker.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      selectedFilter === 'all' ||
      (selectedFilter === 'high-pay' && load.pay > 2000) ||
      (selectedFilter === 'nearby' && load.distance.includes('173')) ||
      (selectedFilter === 'urgent' && load.urgent);
    
    return matchesSearch && matchesFilter;
  });

  const handleLoadPress = (load) => {
    Alert.alert(
      'Load Details',
      `${load.pickup} → ${load.delivery}\nPay: $${load.pay.toLocaleString()}\nDistance: ${load.distance}\nPickup: ${load.pickupTime}\nEquipment: ${load.equipment}\nBroker: ${load.broker}`,
      [
        { text: 'Decline', style: 'cancel' },
        { text: 'Accept', onPress: () => handleAcceptLoad(load) },
      ]
    );
  };

  const handleAcceptLoad = (load) => {
    Alert.alert('Load Accepted', `You've accepted load ${load.id}`);
    // Remove from available loads
    setCurrentLoad(load)
    setLoads(prevLoads => prevLoads.filter(l => l.id !== load.id)); // Remove from available loads
  };

  const renderLoadItem = ({ item }) => (
    <TouchableOpacity style={styles.loadCard} onPress={() => handleLoadPress(item)}>
      <View style={styles.loadHeader}>
        <View style={styles.routeInfo}>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color="#007AFF" />
            <Text style={styles.locationText}>{item.pickup}</Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color="#FF3B30" />
            <Text style={styles.locationText}>{item.delivery}</Text>
          </View>
        </View>
        {item.urgent && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentText}>URGENT</Text>
          </View>
        )}
      </View>

      <View style={styles.loadDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.payAmount}>${item.pay.toLocaleString()}</Text>
          <Text style={styles.distanceText}>{item.distance}</Text>
        </View>
        
        <View style={styles.loadInfo}>
          <View style={styles.infoItem}>
            <Ionicons name="time" size={14} color="#666" />
            <Text style={styles.infoText}>{item.pickupTime}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="cube" size={14} color="#666" />
            <Text style={styles.infoText}>{item.loadType}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="business" size={14} color="#666" />
            <Text style={styles.infoText}>{item.broker}</Text>
          </View>
        </View>
      </View>

      <View style={styles.loadActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.declineButton]}
          onPress={() => Alert.alert('Load Declined', `Declined load ${item.id}`)}
        >
          <Text style={styles.declineText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => handleAcceptLoad(item)}
        >
          <Text style={styles.acceptText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Available Loads</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search loads, locations, brokers..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filters}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedFilter === item.key && styles.filterChipActive,
              ]}
              onPress={() => setSelectedFilter(item.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === item.key && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Loads List */}
      <FlatList
        data={filteredLoads}
        keyExtractor={(item) => item.id}
        renderItem={renderLoadItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.loadsList}
      />
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
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  filterButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 16,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  loadsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  loadCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  routeInfo: {
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  locationText: {
    fontSize: 16,
    marginLeft: 8,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: '#ddd',
    marginLeft: 7,
    marginVertical: 4,
  },
  urgentBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  urgentText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  loadDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  payAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#34C759',
  },
  distanceText: {
    fontSize: 16,
    color: '#666',
  },
  loadInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
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
  declineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  declineText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  acceptText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default LoadsScreen; 