import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const RouteScreen = ({ navigation }) => {
  const [currentRoute, setCurrentRoute] = useState({
    pickup: 'Chicago, IL',
    delivery: 'Dallas, TX',
    eta: '2:30 PM',
    distance: '925 miles',
    duration: '14h 30m',
    fuelStops: 2,
    tolls: 45,
    traffic: 'Moderate',
  });

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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Route Navigation</Text>
        <TouchableOpacity style={styles.voiceButton} onPress={handleVoiceCommand}>
          <Ionicons name="mic" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Map Placeholder */}
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map" size={60} color="#ddd" />
          <Text style={styles.mapPlaceholderText}>Map View</Text>
          <Text style={styles.mapPlaceholderSubtext}>Interactive map with route overlay</Text>
        </View>
        
        {/* Route Summary Overlay */}
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
                <Text style={styles.locationText}>{currentRoute.pickup}</Text>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.locationRow}>
                <Ionicons name="location" size={16} color="#FF3B30" />
                <Text style={styles.locationText}>{currentRoute.delivery}</Text>
              </View>
            </View>
            
            <View style={styles.routeStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>ETA</Text>
                <Text style={styles.statValue}>{currentRoute.eta}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Distance</Text>
                <Text style={styles.statValue}>{currentRoute.distance}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Duration</Text>
                <Text style={styles.statValue}>{currentRoute.duration}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Route Stops */}
      <View style={styles.stopsContainer}>
        <Text style={styles.sectionTitle}>Route Stops</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {routeStops.map((stop, index) => (
            <TouchableOpacity
              key={stop.id}
              style={styles.stopItem}
              onPress={() => handleStopPress(stop)}
            >
              <View style={styles.stopIconContainer}>
                <Ionicons 
                  name={getStopIcon(stop.type)} 
                  size={20} 
                  color={getStopColor(stop.type)} 
                />
                {index < routeStops.length - 1 && (
                  <View style={[styles.stopLine, { backgroundColor: getStopColor(stop.type) }]} />
                )}
              </View>
              
              <View style={styles.stopContent}>
                <View style={styles.stopHeader}>
                  <Text style={styles.stopLocation}>{stop.location}</Text>
                  <Text style={styles.stopTime}>{stop.time}</Text>
                </View>
                <Text style={styles.stopType}>{stop.type.toUpperCase()}</Text>
                {stop.status === 'completed' && (
                  <View style={styles.completedBadge}>
                    <Text style={styles.completedText}>Completed</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
  voiceButton: {
    padding: 8,
  },
  mapContainer: {
    height: 300,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
    flex: 1,
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