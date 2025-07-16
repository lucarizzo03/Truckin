import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import Constants from 'expo-constants';
import BottomSheet from '@gorhom/bottom-sheet';
import 'react-native-gesture-handler';

const GOOGLE_API_KEY = Constants.expoConfig.extra.GOOGLE_API_KEY;

const RouteScreen = ({ navigation, currentLoad }) => {
  const [pickupCoords, setPickupCoords] = useState(null);
  const [deliveryCoords, setDeliveryCoords] = useState(null);

  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ['15%', '40%', '80%'], []);


  useEffect(() => {
    const geocodeAddress = async (address, setter) => {
      if (!address) return;
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`
        );
        const data = await response.json();
        if (data.results && data.results[0]) {
          const { lat, lng } = data.results[0].geometry.location;
          setter({ latitude: lat, longitude: lng });
        }
      } catch (e) {
        setter(null);
      }
    };

    if (currentLoad) {
      geocodeAddress(currentLoad.pickup, setPickupCoords);
      geocodeAddress(currentLoad.delivery, setDeliveryCoords);
    }
  }, [currentLoad]);
  
  const [routeStops, setRouteStops] = useState([
    {
      id: 1,
      type: 'pickup',
      location: 'Chicago, IL',
      time: '8:00 AM',
      status: 'completed',
    },
    {
      id: 2,
      type: 'fuel',
      location: 'Springfield, IL',
      time: '10:30 AM',
      status: 'upcoming',
    },
    {
      id: 3,
      type: 'rest',
      location: 'St. Louis, MO',
      time: '1:00 PM',
      status: 'upcoming',
    },
    {
      id: 4,
      type: 'fuel',
      location: 'Little Rock, AR',
      time: '4:30 PM',
      status: 'upcoming',
    },
    {
      id: 5,
      type: 'delivery',
      location: 'Dallas, TX',
      time: '2:30 PM',
      status: 'upcoming',
    },
  ]);

  const handleVoiceCommand = () => {
    Alert.alert(
      'Voice Commands',
      'Available commands:\n• "Show route"\n• "Find fuel stops"\n• "Update ETA"\n• "Avoid tolls"\n• "Find rest areas"',
      [{ text: 'OK' }]
    );
  };

  const handleStopPress = (stop) => {
    Alert.alert(
      'Stop Details',
      `${stop.location}\nTime: ${stop.time}\nType: ${stop.type}`,
      [{ text: 'OK' }]
    );
  };

  const handleRouteOptimization = () => {
    Alert.alert('Route Optimization', 'Finding the best route with current traffic conditions...');
  };

  const getStopIcon = (type) => {
    switch (type) {
      case 'pickup':
        return 'location';
      case 'delivery':
        return 'location';
      case 'fuel':
        return 'water';
      case 'rest':
        return 'bed';
      default:
        return 'location';
    }
  };

  const getStopColor = (type) => {
    switch (type) {
      case 'pickup':
        return '#007AFF';
      case 'delivery':
        return '#FF3B30';
      case 'fuel':
        return '#FF9500';
      case 'rest':
        return '#34C759';
      default:
        return '#666';
    }
  };

  if (!currentLoad) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="map-outline" size={80} color="#ccc" style={{ marginBottom: 24 }} />
        <Text style={{ fontSize: 22, fontWeight: '600', color: '#444', marginBottom: 8 }}>
          Lets Find a Load
        </Text>
        <Text style={{ fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 24 }}>
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: '#007AFF',
            paddingHorizontal: 32,
            paddingVertical: 12,
            borderRadius: 8,
          }}
          onPress={() => navigation.navigate('Chat')}
        >
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>Ask AutoPilot</Text>
        </TouchableOpacity>
      </View>
    );
  }


  return (
    <View style={styles.container}>
      {/* Map absolutely fills the screen */}
      <View style={styles.mapContainer} pointerEvents="box-none">
        <MapView
          style={{ flex: 1 }}
          initialRegion={{
            latitude: pickupCoords?.latitude || 41.8781,
            longitude: pickupCoords?.longitude || -87.6298,
            latitudeDelta: 5,
            longitudeDelta: 5,
          }}
        >
          {pickupCoords && (
            <Marker coordinate={pickupCoords} title="Pickup" description={currentLoad.pickup} />
          )}
          {deliveryCoords && (
            <Marker coordinate={deliveryCoords} title="Delivery" description={currentLoad.delivery} />
          )}
        </MapView>
      </View>

      {/* Bottom Sheet overlays the map */}
     <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={['30%', '60%']}
      >
    
        {/* Route Summary */}
        <View style={{ padding: 16 }}>
          <View style={styles.routeSummary}>
            <View style={styles.routeHeader}>
              <Text style={styles.routeTitle}>Current Route</Text>
              <TouchableOpacity onPress={handleRouteOptimization}>
                <Ionicons name="refresh" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.routeDetails}>
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
              <View style={styles.routeStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>ETA</Text>
                  <Text style={styles.statValue}>{currentLoad.eta}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Distance</Text>
                  <Text style={styles.statValue}>{currentLoad.distance}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Duration</Text>
                  <Text style={styles.statValue}>{currentLoad.duration}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Next Stop */}
          <View style={styles.stopsContainer}>
            <Text style={styles.sectionTitle}>Next Stop</Text>
            {(() => {
              // Find the first stop that is not completed
              const nextStop = routeStops.find(stop => stop.status !== 'completed');
              if (!nextStop) return <Text style={{ color: '#888' }}>No upcoming stops</Text>;
              return (
                <TouchableOpacity
                  style={styles.stopItem}
                  onPress={() => handleStopPress(nextStop)}
                >
                  <View style={styles.stopIconContainer}>
                    <Ionicons 
                      name={getStopIcon(nextStop.type)} 
                      size={20} 
                      color={getStopColor(nextStop.type)} 
                    />
                  </View>
                  <View style={styles.stopContent}>
                    <View style={styles.stopHeader}>
                      <Text style={styles.stopLocation}>{nextStop.location}</Text>
                      <Text style={styles.stopTime}>{nextStop.time}</Text>
                    </View>
                    <Text style={styles.stopType}>{nextStop.type.toUpperCase()}</Text>
                  </View>
                </TouchableOpacity>
              );
            })()}
          </View>
  

          
          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="water" size={24} color="#FF9500" />
              <Text style={styles.actionText}>Fuel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="bed" size={24} color="#34C759" />
              <Text style={styles.actionText}>Rest</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="warning" size={24} color="#FF3B30" />
              <Text style={styles.actionText}>Traffic</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="card" size={24} color="#AF52DE" />
              <Text style={styles.actionText}>Tolls</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheet>
    
      





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
    position: 'absolute', // Overlay the map
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1, // Lower than BottomSheet (which defaults to a higher zIndex)
    backgroundColor: 'rgba(255,255,255,0.85)', // Optional: semi-transparent
},
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  voiceButton: {
    padding: 8,
  },
  mapContainer: {
  ...StyleSheet.absoluteFillObject,
  zIndex: 0,
},
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  routeSummary: {
    backgroundColor: 'white',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  routeDetails: {
    marginBottom: 8,
  },
  routeInfo: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  locationText: {
    fontSize: 14,
    marginLeft: 8,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  routeLine: {
    width: 2,
    height: 12,
    backgroundColor: '#ddd',
    marginLeft: 7,
    marginVertical: 4,
  },
  routeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  stopsContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  stopItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stopIconContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  stopLine: {
    width: 2,
    height: 30,
    marginTop: 4,
  },
  stopContent: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stopLocation: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  stopTime: {
    fontSize: 14,
    color: '#666',
  },
  stopType: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  completedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  completedText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  actionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default RouteScreen; 