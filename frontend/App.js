import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import HomeScreen from './screens/HomeScreen';
import LoadsScreen from './screens/LoadsScreen';
import RouteScreen from './screens/RouteScreen';
import FinanceScreen from './screens/FinanceScreen';
import ChatScreen from './screens/ChatScreen';
import AuthScreen from './screens/AuthScreen';
import OnboardingScreen from './screens/OnboardingScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function TabNavigator({ currentLoad, setCurrentLoad }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Loads') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Route') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Finance') {
            iconName = focused ? 'card' : 'card-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chatbubble' : 'chatbubble-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >

      <Tab.Screen name="Home"
        children={props => (
          <HomeScreen {...props} currentLoad={currentLoad} setCurrentLoad={setCurrentLoad} />
        )}
      />


      <Tab.Screen name="Loads"
        children={props => (
          <LoadsScreen {...props} setCurrentLoad={setCurrentLoad} />
        )}
      />


      <Tab.Screen name="Route"
        children={props => (
          <RouteScreen {...props} currentLoad={currentLoad}/>
        )}
      />








      <Tab.Screen name="Finance"
        children={props => (
          <FinanceScreen {...props} currentLoad={currentLoad}/>
        )}
      />
      
      
      
      
      
      <Tab.Screen name="Chat"
        children={props => (
          <ChatScreen {...props} setCurrentLoad={setCurrentLoad} />
        )}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = React.useState(false);
  const [currentLoad, setCurrentLoad] = React.useState(null)

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <NavigationContainer>




        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!hasCompletedOnboarding ? (
            <Stack.Screen name="Onboarding">
              {props => (
                <OnboardingScreen
                  {...props}
                  onComplete={() => setHasCompletedOnboarding(true)}
                />
              )}
            </Stack.Screen>
          ) : !isAuthenticated ? (
            <Stack.Screen name="Auth">
              {props => (
                <AuthScreen
                  {...props}
                  onLogin={() => setIsAuthenticated(true)}
                />
              )}
            </Stack.Screen>
          ) : (
            <Stack.Screen name="Main"  
              children={props => (
                <TabNavigator
                  {...props}
                  currentLoad={currentLoad}
                  setCurrentLoad={setCurrentLoad}
                />
              )}
            />
           








          )}
        </Stack.Navigator>




      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 