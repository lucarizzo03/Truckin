import React, { useState, useEffect } from 'react';
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
import { SafeAreaView } from 'react-native';

const LoadsScreen = ({ navigation, setCurrentLoad , route, addCompletedLoad}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Fetch loads from backend
  useEffect(() => {
    fetchLoads();
  }, []);

  // NEW: Handle voice search parameters
  useEffect(() => {
    if (route.params && route) {
      const { destination, origin, equipment_type, min_rate } = route.params;
      
      // Auto-fill search based on voice command
      let autoSearch = '';
      if (destination) {
        autoSearch = destination;
        setSearchQuery(destination);
      }
      if (origin) {
        autoSearch = origin + (destination ? ` to ${destination}` : '');
        setSearchQuery(autoSearch);
      }
      if (equipment_type) {
        // Could add equipment filter logic here
      }
      if (min_rate) {
        setSelectedFilter('high-pay'); // Auto-select high pay filter
      }

      // Clear params after processing to prevent re-triggering
      navigation.setParams({
        destination: null,
        origin: null,
        equipment_type: null,
        min_rate: null
      });
    }
  }, [route?.params]);

  const fetchLoads = async () => {
    try {
      const response = await fetch('http://localhost:2300/api/loads');
      const result = await response.json();
      if (result.success) {
        setLoads(result.loads);
      } else {
        console.error('Failed to fetch loads:', result.error);
      }
    } catch (error) {
      console.error('Failed to fetch loads:', error);
    }
  };
  
  const [loads, setLoads] = useState([]);

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
    const payPerMile = getPayPerMile(load);
    Alert.alert(
      'Load Details',
      `${load.pickup} → ${load.delivery}
        Pay: $${load.pay.toLocaleString()}
        Distance: ${load.distance}
        Pickup: ${load.pickupTime}
        Equipment: ${load.equipment}
        Broker: ${load.broker}
        $${payPerMile} per mile`,
      [
        { text: 'Decline', style: 'cancel' },
        { text: 'Accept', onPress: () => handleAcceptLoad(load) },
      ]
    );
  };

  const handleAcceptLoad = (load) => {
    Alert.alert('Load Accepted', `You've accepted load ${load.id}`);
    // Remove from available loads
    addCompletedLoad(load)
    setCurrentLoad(load)
    setLoads(prevLoads => prevLoads.filter(l => l.id !== load.id)); // Remove from available loads
  };

  function getPayPerMile(load) {
    const miles = parseFloat(load.distance.replace(/[^\d.]/g, ''));
    if (!miles || miles === 0) return null;
    return (load.pay / miles).toFixed(2);
  }

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

         <View style={styles.infoItem}>
            <Ionicons name="trending-up" size={14} color="#007AFF" />
            <View style={styles.payPerMileBadge}>
              <Text style={styles.payPerMileText}>
                ${getPayPerMile(item)} /mi
              </Text>
            </View>
          </View>

        </View>
      </View>

      <View style={styles.loadActions}>
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
    <SafeAreaView style={styles.container}>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f8fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
  },
  filterButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f0f6ff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#007AFF',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#222',
    paddingVertical: 6,
  },
  filtersContainer: {
    marginTop: 10,
    marginBottom: 8,
    paddingLeft: 20,
  },
  filterChip: {
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    color: '#222',
    fontWeight: '600',
    fontSize: 14,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  loadsList: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  loadCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  loadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
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
    fontSize: 18,
    marginLeft: 8,
    color: '#222',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  routeLine: {
    width: 2,
    height: 18,
    backgroundColor: '#e0e0e0',
    marginLeft: 7,
    marginVertical: 4,
    borderRadius: 1,
  },
  urgentBadge: {
    backgroundColor: '#fff0f0',
    borderColor: '#FF3B30',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  urgentText: {
    color: '#FF3B30',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  loadDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  payAmount: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#34C759',
    letterSpacing: 0.5,
  },
  distanceText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    backgroundColor: '#f0f6ff',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  loadInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 14,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#444',
    marginLeft: 4,
    fontWeight: '500',
  },
  payPerMileBadge: {
    backgroundColor: '#e6f7ff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 4,
  },
  payPerMileText: {
    color: '#007AFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  loadActions: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#FF3B30',
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  declineText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF3B30',
  },
  acceptText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
});

export default LoadsScreen; 