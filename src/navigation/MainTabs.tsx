import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import Icon from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import HomeScreen from '../screens/HomeScreen';
import RushScreen from '../screens/RushScreen';
import { Colors } from '../theme';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const { user } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.text.secondary,
        headerShown: false,
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" color={color} size={size} />
          ),
          tabBarLabel: 'Accueil',
        }}
      />
      
      {user?.role === 'rush' && (
        <Tab.Screen
          name="Rush"
          component={RushScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Icon name="alert-triangle" color={color} size={size} />
            ),
            tabBarLabel: 'RUSH',
          }}
        />
      )}
    </Tab.Navigator>
  );
}
