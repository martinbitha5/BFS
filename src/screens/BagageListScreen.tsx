import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { databaseServiceInstance, authServiceInstance } from '../services';
import { Baggage } from '../types/baggage.types';
import { BaggageCard } from '../components';
import { Colors, Spacing, FontSizes, FontWeights } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'BagageList'>;

export default function BagageListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [baggages, setBaggages] = useState<Baggage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBaggages();
  }, []);

  const loadBaggages = async () => {
    try {
      setLoading(true);
      const user = await authServiceInstance.getCurrentUser();
      if (!user) return;

      // Récupérer tous les bagages de l'aéroport en une seule requête batch
      const allBaggages = await databaseServiceInstance.getBaggagesByAirport(user.airportCode);

      // Trier par date de création (plus récent en premier)
      allBaggages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setBaggages(allBaggages);
    } catch (error) {
      console.error('Error loading baggages:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadBaggages();
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="bag-outline" size={64} color={Colors.text.secondary} />
      <Text style={styles.emptyTitle}>Aucun bagage</Text>
      <Text style={styles.emptyText}>Aucun bagage n'a été enregistré pour le moment.</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary.main} />
        <Text style={styles.loadingText}>Chargement des bagages...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <View>
          <Text style={styles.title}>Liste des Bagages</Text>
          <Text style={styles.subtitle}>{baggages.length} bagage{baggages.length > 1 ? 's' : ''} enregistré{baggages.length > 1 ? 's' : ''}</Text>
        </View>
      </View>

      <FlatList
        data={baggages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BaggageCard
            baggage={item}
            showPassengerInfo={false}
            onPress={() => navigation.navigate('BagageDetail', { id: item.rfidTag })}
          />
        )}
        contentContainerStyle={baggages.length === 0 ? styles.emptyList : styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary.main]}
            tintColor={Colors.primary.main}
          />
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text.secondary,
    fontWeight: FontWeights.medium,
  },
  header: {
    padding: Spacing.lg,
    backgroundColor: Colors.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs / 2,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    color: Colors.text.secondary,
  },
  listContent: {
    padding: Spacing.md,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
