import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Colors } from '../theme';

import ArrivalScreen from '../screens/ArrivalScreen';
import BagageDetailScreen from '../screens/BagageDetailScreen';
import BagageListScreen from '../screens/BagageListScreen';
import BaggageScreen from '../screens/BaggageScreen';
import BoardingScreen from '../screens/BoardingScreen';
import CheckinScreen from '../screens/CheckinScreen';
import CreditsScreen from '../screens/CreditsScreen';
import FAQScreen from '../screens/FAQScreen';
import FlightSelectionScreen from '../screens/FlightSelectionScreen';
import HomeScreen from '../screens/HomeScreen';
import LegalScreen from '../screens/LegalScreen';
import LoginScreen from '../screens/LoginScreen';
import PassengerDetailScreen from '../screens/PassengerDetailScreen';
import RegisterScreen from '../screens/RegisterScreen';
import RushScreen from '../screens/RushScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  FlightSelection: { targetScreen: 'Baggage' | 'Boarding' | 'Arrival' };
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
  Credits: undefined;
  Rush: undefined;
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
      <Stack.Screen name="FlightSelection" component={FlightSelectionScreen} options={{ headerShown: false }} />
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
      <Stack.Screen name="Credits" component={CreditsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Rush" component={RushScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

