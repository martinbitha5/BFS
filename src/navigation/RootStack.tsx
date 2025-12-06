import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors } from '../theme';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import CheckinScreen from '../screens/CheckinScreen';
import BaggageScreen from '../screens/BaggageScreen';
import BoardingScreen from '../screens/BoardingScreen';
import ArrivalScreen from '../screens/ArrivalScreen';
import BagageListScreen from '../screens/BagageListScreen';
import BagageDetailScreen from '../screens/BagageDetailScreen';
import PassengerDetailScreen from '../screens/PassengerDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import FAQScreen from '../screens/FAQScreen';
import LegalScreen from '../screens/LegalScreen';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Checkin: undefined;
  Baggage: undefined;
  Boarding: undefined;
  Arrival: undefined;
  BagageList: undefined;
  BagageDetail: { id: string };
  PassengerDetail: { id: string };
  Settings: undefined;
  FAQ: undefined;
  Legal: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStack() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.primary.main,
        },
        headerTintColor: Colors.primary.contrast,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: true,
      }}>
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Inscription' }} />
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Checkin" component={CheckinScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Baggage" component={BaggageScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Boarding" component={BoardingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Arrival" component={ArrivalScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BagageList" component={BagageListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BagageDetail" component={BagageDetailScreen} options={{ title: 'Détails du Bagage' }} />
      <Stack.Screen name="PassengerDetail" component={PassengerDetailScreen} options={{ title: 'Détails du Passager' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="FAQ" component={FAQScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Legal" component={LegalScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

