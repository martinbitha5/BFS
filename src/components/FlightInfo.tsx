import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../theme';
import { getAirportByCode } from '../../constants/airports';

interface FlightInfoProps {
  flightNumber: string;
  route: string;
  departure: string;
  arrival: string;
  flightTime?: string;
  seatNumber?: string;
}

export default function FlightInfo({
  flightNumber,
  route,
  departure,
  arrival,
  flightTime,
  seatNumber,
}: FlightInfoProps) {
  const departureAirport = getAirportByCode(departure);
  const arrivalAirport = getAirportByCode(arrival);

  return (
    <View style={styles.container}>
      <View style={styles.routeContainer}>
        <View style={styles.airport}>
          <Text style={styles.airportCode}>{departure}</Text>
          <Text style={styles.airportName}>
            {departureAirport?.name || departure}
          </Text>
        </View>
        <View style={styles.arrowContainer}>
          <View style={styles.line} />
          <Text style={styles.arrow}>→</Text>
        </View>
        <View style={styles.airport}>
          <Text style={styles.airportCode}>{arrival}</Text>
          <Text style={styles.airportName}>
            {arrivalAirport?.name || arrival}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Vol</Text>
          <Text style={styles.detailValue}>{flightNumber}</Text>
        </View>
        {flightTime && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Heure</Text>
            <Text style={styles.detailValue}>{flightTime}</Text>
          </View>
        )}
        {seatNumber && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Siège</Text>
            <Text style={styles.detailValue}>{seatNumber}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.paper,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  airport: {
    flex: 1,
    alignItems: 'center',
  },
  airportCode: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.primary.main,
    marginBottom: Spacing.xs,
    letterSpacing: 1,
  },
  airportName: {
    fontSize: FontSizes.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  arrowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    flex: 1,
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border.main,
  },
  arrow: {
    fontSize: FontSizes.xl,
    color: Colors.primary.main,
    marginHorizontal: Spacing.xs,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: FontSizes.xs,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs / 2,
  },
  detailValue: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text.primary,
    letterSpacing: 0.2,
  },
});

