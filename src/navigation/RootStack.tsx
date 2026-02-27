import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../theme';

import ArrivalScreen from '../screens/ArrivalScreen';
import BagageDetailScreen from '../screens/BagageDetailScreen';
import BagageListScreen from '../screens/BagageListScreen';
import BaggageScreen from '../screens/BaggageScreen';
import BoardingScreen from '../screens/BoardingScreen';
import ManualBaggageScreen from '../screens/ManualBaggageScreen';
import OffloadBaggageScreen from '../screens/OffloadBaggageScreen';
import OffloadBoardingScreen from '../screens/OffloadBoardingScreen';
import CheckinScreen from '../screens/CheckinScreen';
import ConfirmLoadScreen from '../screens/ConfirmLoadScreen';
import CreditsScreen from '../screens/CreditsScreen';
import DeliveryScreen from '../screens/DeliveryScreen';
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
  Delivery: undefined;
  OffloadBoarding: undefined;
  ManualBaggage: undefined;
  OffloadBaggage: undefined;
  ConfirmLoad: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStack() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background.default }}>
        <ActivityIndicator size="large" color={Colors.primary.main} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      key={isAuthenticated ? 'main' : 'auth'}
      initialRouteName={isAuthenticated ? 'Home' : 'Login'}
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
      <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
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
      <Stack.Screen name="Delivery" component={DeliveryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="OffloadBoarding" component={OffloadBoardingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ManualBaggage" component={ManualBaggageScreen} options={{ headerShown: false }} />
      <Stack.Screen name="OffloadBaggage" component={OffloadBaggageScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ConfirmLoad" component={ConfirmLoadScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

