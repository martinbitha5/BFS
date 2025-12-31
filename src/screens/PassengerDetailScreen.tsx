import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getAirportByCode } from '../../constants/airports';
import { Badge, BaggageCard, Card, FlightInfo } from '../components';
import { RootStackParamList } from '../navigation/RootStack';
import { databaseServiceInstance } from '../services';
import { Colors, FontSizes, FontWeights, Spacing } from '../theme';
import { Baggage } from '../types/baggage.types';
import { BoardingStatus } from '../types/boarding.types';
import { Passenger } from '../types/passenger.types';

type Props = NativeStackScreenProps<RootStackParamList, 'PassengerDetail'>;

export default function PassengerDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const [passenger, setPassenger] = useState<Passenger | null>(null);
  const [baggages, setBaggages] = useState<Baggage[]>([]);
  const [boardingStatus, setBoardingStatus] = useState<BoardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPassengerDetails();
  }, [id]);

  const loadPassengerDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger le passager
      const passengerData = await databaseServiceInstance.getPassengerById(id);
      if (!passengerData) {
        setError('Passager non trouvé');
        setLoading(false);
        return;
      }

      setPassenger(passengerData);

      // Charger les bagages et le statut d'embarquement en parallèle
      const [passengerBaggages, boarding] = await Promise.all([
        databaseServiceInstance.getBaggagesByPassengerId(id),
        databaseServiceInstance.getBoardingStatusByPassengerId(id),
      ]);

      setBaggages(passengerBaggages);
      setBoardingStatus(boarding);
    } catch (err) {
      console.error('Error loading passenger details:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
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

  if (error || !passenger) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={Colors.error.main} />
        <Text style={styles.errorTitle}>Erreur</Text>
        <Text style={styles.errorText}>{error || 'Passager non trouvé'}</Text>
      </View>
    );
  }

  const departureAirport = getAirportByCode(passenger.departure);
  const arrivalAirport = getAirportByCode(passenger.arrival);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* En-tête avec informations principales */}
      <Card style={styles.headerCard}>
        <View style={styles.headerContent}>
          <View style={styles.pnrContainer}>
            <Text style={styles.pnrLabel}>PNR</Text>
            <Text style={styles.pnrValue}>{passenger.pnr}</Text>
          </View>
          <Badge
            label={passenger.synced ? 'Synchronisé' : 'En attente'}
            variant={passenger.synced ? 'success' : 'warning'}
          />
        </View>
      </Card>

      {/* Informations du passager */}
      <Card style={styles.infoCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="person-outline" size={24} color={Colors.primary.main} />
          <Text style={styles.sectionTitle}>Informations personnelles</Text>
        </View>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Nom complet</Text>
            <Text style={styles.infoValue}>{passenger.fullName}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Prénom</Text>
            <Text style={styles.infoValue}>{passenger.firstName}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Nom</Text>
            <Text style={styles.infoValue}>{passenger.lastName}</Text>
          </View>
        </View>
      </Card>

      {/* Informations de vol */}
      {passenger.flightNumber && (
        <Card style={styles.flightCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="airplane-outline" size={24} color={Colors.primary.main} />
            <Text style={styles.sectionTitle}>Informations de vol</Text>
          </View>
          <FlightInfo
            flightNumber={passenger.flightNumber}
            route={passenger.route}
            departure={passenger.departure}
            arrival={passenger.arrival}
            flightTime={passenger.flightTime}
            seatNumber={passenger.seatNumber}
          />
          <View style={styles.flightDetails}>
            {passenger.airline && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Compagnie</Text>
                <Text style={styles.detailValue}>{passenger.airline}</Text>
              </View>
            )}
            {passenger.ticketNumber && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Numéro de ticket</Text>
                <Text style={styles.detailValue}>{passenger.ticketNumber}</Text>
              </View>
            )}
          </View>
        </Card>
      )}

      {/* Statut d'embarquement */}
      <Card style={styles.boardingCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="checkmark-circle-outline" size={24} color={Colors.primary.main} />
          <Text style={styles.sectionTitle}>Statut d'embarquement</Text>
        </View>
        {boardingStatus?.boarded ? (
          <View style={styles.boardingStatus}>
            <Badge label="Embarqué" variant="success" />
            {boardingStatus.boardedAt && (
              <Text style={styles.boardingDate}>
                Le {formatDate(boardingStatus.boardedAt)}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.boardingStatus}>
            <Badge label="Non embarqué" variant="warning" />
          </View>
        )}
      </Card>

      {/* Bagages */}
      <Card style={styles.baggagesCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="bag-outline" size={24} color={Colors.primary.main} />
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>Bagages</Text>
            <Badge
              label={`${baggages.length}/${passenger.baggageCount}`}
              variant={baggages.length >= passenger.baggageCount ? 'success' : 'info'}
            />
          </View>
        </View>
        {baggages.length === 0 ? (
          <View style={styles.emptyBaggages}>
            <Ionicons name="bag-outline" size={48} color={Colors.text.secondary} />
            <Text style={styles.emptyText}>Aucun bagage enregistré</Text>
          </View>
        ) : (
          <View style={styles.baggagesList}>
            {baggages.map((baggage) => (
              <BaggageCard
                key={baggage.id}
                baggage={baggage}
                showPassengerInfo={false}
                onPress={() => navigation.navigate('BagageDetail', { id: baggage.tagNumber })}
              />
            ))}
          </View>
        )}
      </Card>

      {/* Informations d'enregistrement */}
      <Card style={styles.registrationCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="time-outline" size={24} color={Colors.primary.main} />
          <Text style={styles.sectionTitle}>Enregistrement</Text>
        </View>
        <View style={styles.registrationInfo}>
          <View style={styles.registrationItem}>
            <Text style={styles.registrationLabel}>Enregistré le</Text>
            <Text style={styles.registrationValue}>{formatDate(passenger.checkedInAt)}</Text>
          </View>
          <View style={styles.registrationItem}>
            <Text style={styles.registrationLabel}>Créé le</Text>
            <Text style={styles.registrationValue}>{formatDate(passenger.createdAt)}</Text>
          </View>
        </View>
      </Card>
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
  pnrContainer: {
    flex: 1,
  },
  pnrLabel: {
    fontSize: FontSizes.xs,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs / 2,
    fontWeight: FontWeights.medium,
  },
  pnrValue: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.text.primary,
    fontFamily: 'monospace',
  },
  infoCard: {
    margin: Spacing.md,
    marginTop: 0,
  },
  flightCard: {
    margin: Spacing.md,
    marginTop: 0,
  },
  boardingCard: {
    margin: Spacing.md,
    marginTop: 0,
  },
  baggagesCard: {
    margin: Spacing.md,
    marginTop: 0,
  },
  registrationCard: {
    margin: Spacing.md,
    marginTop: 0,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text.primary,
    flex: 1,
  },
  infoGrid: {
    gap: Spacing.md,
  },
  infoItem: {
    marginBottom: Spacing.sm,
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
  flightDetails: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.md,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: FontSizes.xs,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs / 2,
  },
  detailValue: {
    fontSize: FontSizes.sm,
    color: Colors.text.primary,
    fontWeight: FontWeights.medium,
  },
  boardingStatus: {
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  boardingDate: {
    fontSize: FontSizes.sm,
    color: Colors.text.secondary,
  },
  emptyBaggages: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.text.secondary,
    marginTop: Spacing.sm,
  },
  baggagesList: {
    gap: Spacing.sm,
  },
  registrationInfo: {
    gap: Spacing.md,
  },
  registrationItem: {
    marginBottom: Spacing.sm,
  },
  registrationLabel: {
    fontSize: FontSizes.xs,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs / 2,
    fontWeight: FontWeights.medium,
  },
  registrationValue: {
    fontSize: FontSizes.md,
    color: Colors.text.primary,
    fontWeight: FontWeights.semibold,
  },
});

