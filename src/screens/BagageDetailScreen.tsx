import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { databaseServiceInstance } from '../services';
import { Baggage } from '../types/baggage.types';
import { Passenger } from '../types/passenger.types';
import { BaggageCard, PassengerCard, FlightInfo, Card, Badge } from '../components';
import { Colors, Spacing, FontSizes, FontWeights } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'BagageDetail'>;

export default function BagageDetailScreen({ route }: Props) {
  const { id } = route.params;
  const [baggage, setBaggage] = useState<Baggage | null>(null);
  const [passenger, setPassenger] = useState<Passenger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBaggageDetails();
  }, [id]);

  const loadBaggageDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Chercher le bagage par RFID tag (méthode optimisée)
      const foundBaggage = await databaseServiceInstance.getBaggageByRfidTag(id);

      if (!foundBaggage) {
        setError('Bagage non trouvé');
        setLoading(false);
        return;
      }

      setBaggage(foundBaggage);

      // Charger les informations du passager
      const passengerData = await databaseServiceInstance.getPassengerById(foundBaggage.passengerId);
      setPassenger(passengerData);
    } catch (err) {
      console.error('Error loading baggage details:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary.main} />
        <Text style={styles.loadingText}>Chargement des détails...</Text>
      </View>
    );
  }

  if (error || !baggage) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={Colors.error.main} />
        <Text style={styles.errorTitle}>Erreur</Text>
        <Text style={styles.errorText}>{error || 'Bagage non trouvé'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* En-tête avec tag RFID */}
      <Card style={styles.headerCard}>
        <View style={styles.headerContent}>
          <View style={styles.tagContainer}>
            <Text style={styles.tagLabel}>Tag RFID</Text>
            <Text style={styles.tagValue}>{baggage.rfidTag}</Text>
          </View>
          <Badge
            label={baggage.status === 'arrived' ? 'Arrivé' : 'En transit'}
            variant={baggage.status === 'arrived' ? 'success' : 'info'}
          />
        </View>
        {baggage.expectedTag && baggage.expectedTag === baggage.rfidTag && (
          <View style={styles.expectedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success.main} />
            <Text style={styles.expectedText}>Tag attendu</Text>
          </View>
        )}
      </Card>

      {/* Informations du bagage */}
      <Card style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Informations du bagage</Text>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Statut</Text>
            <Text style={styles.infoValue}>
              {baggage.status === 'arrived' ? 'Arrivé' : 'En transit'}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Synchronisé</Text>
            <View style={styles.syncStatus}>
              <View style={[styles.syncDot, baggage.synced ? styles.synced : styles.notSynced]} />
              <Text style={styles.infoValue}>{baggage.synced ? 'Oui' : 'Non'}</Text>
            </View>
          </View>
        </View>
        {baggage.checkedAt && (
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Scanné le</Text>
              <Text style={styles.infoValue}>{formatDate(baggage.checkedAt)}</Text>
            </View>
          </View>
        )}
        {baggage.arrivedAt && (
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Arrivé le</Text>
              <Text style={styles.infoValue}>{formatDate(baggage.arrivedAt)}</Text>
            </View>
          </View>
        )}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Créé le</Text>
            <Text style={styles.infoValue}>{formatDate(baggage.createdAt)}</Text>
          </View>
        </View>
      </Card>

      {/* Informations du passager */}
      {passenger && (
        <>
          <Card style={styles.passengerCard}>
            <Text style={styles.sectionTitle}>Passager propriétaire</Text>
            <PassengerCard passenger={passenger} showDetails={true} />
          </Card>

          {passenger.flightNumber && (
            <Card style={styles.flightCard}>
              <Text style={styles.sectionTitle}>Informations de vol</Text>
              <FlightInfo
                flightNumber={passenger.flightNumber}
                route={passenger.route}
                departure={passenger.departure}
                arrival={passenger.arrival}
                flightTime={passenger.flightTime}
                seatNumber={passenger.seatNumber}
              />
            </Card>
          )}
        </>
      )}
    </ScrollView>
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
  errorTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontSize: FontSizes.md,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  headerCard: {
    margin: Spacing.md,
    marginBottom: Spacing.sm,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tagContainer: {
    flex: 1,
  },
  tagLabel: {
    fontSize: FontSizes.xs,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs / 2,
    fontWeight: FontWeights.medium,
  },
  tagValue: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.text.primary,
    fontFamily: 'monospace',
  },
  expectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    padding: Spacing.xs,
    backgroundColor: Colors.success.light + '20',
    borderRadius: 4,
    alignSelf: 'flex-start',
    gap: Spacing.xs / 2,
  },
  expectedText: {
    fontSize: FontSizes.xs,
    color: Colors.success.dark,
    fontWeight: FontWeights.semibold,
  },
  infoCard: {
    margin: Spacing.md,
    marginTop: 0,
  },
  passengerCard: {
    margin: Spacing.md,
    marginTop: 0,
  },
  flightCard: {
    margin: Spacing.md,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: FontSizes.xs,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs / 2,
    fontWeight: FontWeights.medium,
  },
  infoValue: {
    fontSize: FontSizes.md,
    color: Colors.text.primary,
    fontWeight: FontWeights.semibold,
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  synced: {
    backgroundColor: Colors.success.main,
  },
  notSynced: {
    backgroundColor: Colors.warning.main,
  },
});
