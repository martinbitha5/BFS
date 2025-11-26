import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AIRPORTS } from '../../constants/airports';
import { Badge, Button, Card, Input, SelectModal, Toast } from '../components';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/RootStack';
import { auditService, authServiceInstance, databaseServiceInstance, exportService } from '../services';
import { BorderRadius, FontSizes, FontWeights, Spacing } from '../theme';
import { AuditLog } from '../types/audit.types';
import { Baggage } from '../types/baggage.types';
import { BoardingStatus } from '../types/boarding.types';
import { Passenger } from '../types/passenger.types';
import { logAudit } from '../utils/audit.util';

type Props = NativeStackScreenProps<RootStackParamList, 'Supervisor'>;

interface Statistics {
  totalPassengers: number;
  totalBaggages: number;
  boardedPassengers: number;
  notBoardedPassengers: number;
  arrivedBaggages: number;
  inTransitBaggages: number;
  pendingSync: number;
  todayPassengers: number;
  todayBaggages: number;
  todayBoarded: number;
  todayArrived: number;
  flightsCount: number;
  uniqueFlights: string[];
}

type ViewMode = 'overview' | 'passengers' | 'audit';

export default function SupervisorScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [baggages, setBaggages] = useState<Baggage[]>([]);
  const [boardingStatuses, setBoardingStatuses] = useState<BoardingStatus[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [filteredPassengers, setFilteredPassengers] = useState<Passenger[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    totalPassengers: 0,
    totalBaggages: 0,
    boardedPassengers: 0,
    notBoardedPassengers: 0,
    arrivedBaggages: 0,
    inTransitBaggages: 0,
    pendingSync: 0,
    todayPassengers: 0,
    todayBaggages: 0,
    todayBoarded: 0,
    todayArrived: 0,
    flightsCount: 0,
    uniqueFlights: [],
  });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingEmail, setExportingEmail] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  const [filters, setFilters] = useState({
    date: '',
    route: '',
  });
  const [tempFilters, setTempFilters] = useState({
    date: '',
    route: '',
  });
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [routeModalVisible, setRouteModalVisible] = useState(false);
  const [assignedAirport, setAssignedAirport] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('overview');

  useEffect(() => {
    loadAllData();
    logAudit('VIEW_STATISTICS', 'system', 'Consultation du tableau de bord superviseur');
  }, []);

  useEffect(() => {
    // Appliquer les filtres quand les passagers ou les filtres changent
    applyFilters();
  }, [applyFilters]);

  const loadAllData = async () => {
    console.log('[Supervisor] loadAllData called');
    setLoading(true);
    try {
      const user = await authServiceInstance.getCurrentUser();
      if (!user) {
        console.warn('[Supervisor] No user found');
        return;
      }
      console.log('[Supervisor] User found:', { email: user.email, airportCode: user.airportCode, role: user.role });
      setAssignedAirport(user.airportCode);

      // Charger tous les passagers de l'aéroport
      const allPassengers = await databaseServiceInstance.getPassengersByAirport(user.airportCode);
      console.log(`[Supervisor] Loaded ${allPassengers.length} passengers for airport ${user.airportCode}`);
      setPassengers(allPassengers);
      // Initialiser filteredPassengers avec tous les passagers (les filtres seront appliqués par useEffect)
      setFilteredPassengers(allPassengers);

      // Charger tous les bagages et statuts d'embarquement en parallèle avec méthodes batch
      const passengerIds = allPassengers.map(p => p.id);
      
      const [allBaggages, allBoardingStatuses] = await Promise.all([
        databaseServiceInstance.getBaggagesByAirport(user.airportCode),
        databaseServiceInstance.getBoardingStatusesByAirport(user.airportCode),
      ]);
      
      console.log(`[Supervisor] Loaded ${allBaggages.length} baggages`);
      console.log(`[Supervisor] Loaded ${allBoardingStatuses.length} boarding statuses`);
      setBaggages(allBaggages);
      setBoardingStatuses(allBoardingStatuses);

      // Charger les logs d'audit pour l'aéroport du superviseur (tous les agents de cet aéroport)
      try {
        const logs = await auditService.getAuditLogsByAirport(user.airportCode, 500);
        console.log(`[Supervisor] Loaded ${logs.length} audit logs for airport ${user.airportCode}`);
        setAuditLogs(logs);
      } catch (error) {
        console.error('Error loading audit logs:', error);
        // Ne pas bloquer l'application si l'audit échoue
        setAuditLogs([]);
      }

      // Calculer les statistiques
      calculateStatistics(allPassengers, allBaggages, allBoardingStatuses);
      console.log(`[Supervisor] Statistics calculated:`, {
        passengers: allPassengers.length,
        baggages: allBaggages.length,
        boardingStatuses: allBoardingStatuses.length,
        statistics: statistics,
      });
      console.log(`[Supervisor] Filtered passengers: ${filteredPassengers.length}`);
    } catch (error) {
      console.error('[Supervisor] Error loading data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      setToastMessage(`Erreur lors du chargement des données: ${errorMessage}`);
      setToastType('error');
      setShowToast(true);
      // Réinitialiser les données en cas d'erreur
      setPassengers([]);
      setBaggages([]);
      setBoardingStatuses([]);
      setFilteredPassengers([]);
      setAuditLogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStatistics = (
    allPassengers: Passenger[],
    allBaggages: Baggage[],
    allBoardingStatuses: BoardingStatus[]
  ) => {
    const today = new Date().toISOString().split('T')[0];
    
    const boardedIds = new Set(allBoardingStatuses.filter(bs => bs.boarded).map(bs => bs.passengerId));
    const boardedCount = boardedIds.size;
    const notBoardedCount = allPassengers.length - boardedCount;
    
    const arrivedCount = allBaggages.filter(b => b.status === 'arrived').length;
    const inTransitCount = allBaggages.length - arrivedCount;

    // Statistiques du jour
    const todayPassengers = allPassengers.filter(p => p.checkedInAt?.startsWith(today)).length;
    const todayBaggages = allBaggages.filter(b => b.checkedAt?.startsWith(today)).length;
    const todayBoarded = allBoardingStatuses.filter(bs => 
      bs.boarded && bs.boardedAt?.startsWith(today)
    ).length;
    const todayArrived = allBaggages.filter(b => 
      b.status === 'arrived' && b.arrivedAt?.startsWith(today)
    ).length;

    // Vols uniques
    const uniqueFlights = [...new Set(allPassengers.map(p => p.flightNumber))];

    // Compter les éléments en attente de synchronisation
    const pendingPassengers = allPassengers.filter(p => !p.synced).length;
    const pendingBaggages = allBaggages.filter(b => !b.synced).length;
    const pendingBoarding = allBoardingStatuses.filter(bs => !bs.synced).length;
    const pendingSync = pendingPassengers + pendingBaggages + pendingBoarding;

    setStatistics({
      totalPassengers: allPassengers.length,
      totalBaggages: allBaggages.length,
      boardedPassengers: boardedCount,
      notBoardedPassengers: notBoardedCount,
      arrivedBaggages: arrivedCount,
      inTransitBaggages: inTransitCount,
      pendingSync,
      todayPassengers,
      todayBaggages,
      todayBoarded,
      todayArrived,
      flightsCount: uniqueFlights.length,
      uniqueFlights,
    });
  };

  const applyFilters = useCallback(() => {
    // Si pas de passagers, initialiser avec un tableau vide
    if (passengers.length === 0) {
      setFilteredPassengers([]);
      return;
    }

    let filtered = [...passengers];

    if (filters.date) {
      filtered = filtered.filter((p) => p.checkedInAt?.startsWith(filters.date));
    }

    if (filters.route && assignedAirport) {
      filtered = filtered.filter((p) => {
        // L'aéroport assigné est l'origine, la route sélectionnée est la destination
        return p.departure?.toUpperCase() === assignedAirport.toUpperCase() &&
               p.arrival?.toUpperCase() === filters.route.toUpperCase();
      });
    }

    console.log(`[Supervisor] Filters applied: ${filtered.length} passengers (from ${passengers.length} total)`);
    setFilteredPassengers(filtered);
  }, [filters, passengers, assignedAirport]);

  const handleExportEmail = async () => {
    if (passengers.length === 0) {
      Alert.alert('Aucune donnée', 'Il n\'y a aucune donnée à exporter pour cet aéroport.');
      return;
    }

    setExportingEmail(true);
    try {
      const user = await authServiceInstance.getCurrentUser();
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      // Enregistrer l'action d'audit
      await logAudit(
        'EXPORT_DATA',
        'export',
        `Export Excel par Email - Aéroport: ${user.airportCode} - ${passengers.length} passager(s), ${baggages.length} bagage(s), ${boardingStatuses.length} embarquement(s) - Email: ${user.email}`
      );

      // Exporter TOUTES les opérations de l'aéroport et envoyer par email
      try {
        await exportService.exportAndEmail(
          user.airportCode,
          passengers,
          baggages,
          boardingStatuses,
          user.email
        );
      } catch (exportError) {
        console.error('[Supervisor] Export email error:', exportError);
        throw exportError;
      }
      
      setToastMessage(`Export Excel par Email réussi - ${passengers.length} passagers, ${baggages.length} bagages, ${boardingStatuses.length} embarquements`);
      setToastType('success');
      setShowToast(true);
    } catch (error) {
      console.error('Error exporting:', error);
      setToastMessage(error instanceof Error ? error.message : 'Erreur lors de l\'export');
      setToastType('error');
      setShowToast(true);
    } finally {
      setExportingEmail(false);
    }
  };

  const handleExportFile = async () => {
    if (passengers.length === 0) {
      Alert.alert('Aucune donnée', 'Il n\'y a aucune donnée à exporter pour cet aéroport.');
      return;
    }

    setExporting(true);
    try {
      const user = await authServiceInstance.getCurrentUser();
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      // Enregistrer l'action d'audit
      await logAudit(
        'EXPORT_DATA',
        'export',
        `Export Excel fichier - Aéroport: ${user.airportCode} - ${passengers.length} passager(s), ${baggages.length} bagage(s), ${boardingStatuses.length} embarquement(s)`
      );

      // Exporter TOUTES les opérations de l'aéroport (fichier uniquement)
      try {
        const fileUri = await exportService.exportExcelFile(
          user.airportCode,
          passengers,
          baggages,
          boardingStatuses
        );
        console.log('[Supervisor] Excel file created:', fileUri);
      } catch (exportError) {
        console.error('[Supervisor] Export file error:', exportError);
        throw exportError;
      }
      
      setToastMessage(`Export Excel réussi - ${passengers.length} passagers, ${baggages.length} bagages, ${boardingStatuses.length} embarquements`);
      setToastType('success');
      setShowToast(true);
    } catch (error) {
      console.error('Error exporting:', error);
      setToastMessage(error instanceof Error ? error.message : 'Erreur lors de l\'export');
      setToastType('error');
      setShowToast(true);
    } finally {
      setExporting(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      date: '',
      route: '',
    });
    setTempFilters({
      date: '',
      route: '',
    });
  };

  const openFilterModal = () => {
    setTempFilters({ ...filters });
    setFilterModalVisible(true);
  };

  const closeFilterModal = () => {
    setFilterModalVisible(false);
  };

  const applyFiltersFromModal = () => {
    setFilters({ ...tempFilters });
    setFilterModalVisible(false);
  };

  const resetFiltersInModal = () => {
    setTempFilters({
      date: '',
      route: '',
    });
  };

  const getFilteredCount = (filterValues: { date: string; route: string }) => {
    if (!filterValues.date && !filterValues.route) {
      return passengers.length;
    }
    return passengers.filter(p => {
      const matchesDate = !filterValues.date || p.checkedInAt?.startsWith(filterValues.date);
      let matchesRoute = true;
      if (filterValues.route && assignedAirport) {
        // L'aéroport assigné est l'origine, la route sélectionnée est la destination
        matchesRoute = p.departure?.toUpperCase() === assignedAirport.toUpperCase() &&
                       p.arrival?.toUpperCase() === filterValues.route.toUpperCase();
      }
      return matchesDate && matchesRoute;
    }).length;
  };

  // Obtenir les aéroports disponibles pour la destination (exclure l'aéroport assigné)
  const getAvailableDestinations = () => {
    if (!assignedAirport) {
      // Si pas d'aéroport assigné, retourner tous les aéroports
      return AIRPORTS.map(airport => ({
        label: `${airport.name} (${airport.code})`,
        value: airport.code,
      }));
    }
    return AIRPORTS
      .filter(airport => airport.code !== assignedAirport)
      .map(airport => ({
        label: `${airport.name} (${airport.code})`,
        value: airport.code,
      }));
  };

  const getDestinationName = (code: string) => {
    const airport = AIRPORTS.find(a => a.code === code);
    return airport ? `${airport.name} (${airport.code})` : code;
  };

  // Mémoriser les bagages par passager pour éviter les recalculs
  const baggagesByPassengerId = useMemo(() => {
    const map = new Map<string, Baggage[]>();
    baggages.forEach(baggage => {
      const existing = map.get(baggage.passengerId) || [];
      map.set(baggage.passengerId, [...existing, baggage]);
    });
    return map;
  }, [baggages]);

  // Mémoriser les statuts d'embarquement par passager
  const boardingStatusesByPassengerId = useMemo(() => {
    const map = new Map<string, BoardingStatus>();
    boardingStatuses.forEach(status => {
      map.set(status.passengerId, status);
    });
    return map;
  }, [boardingStatuses]);

  const renderPassengerItem = useCallback(({ item }: { item: Passenger }) => {
    const boardingStatus = boardingStatusesByPassengerId.get(item.id);
    const passengerBaggages = baggagesByPassengerId.get(item.id) || [];
    
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          logAudit('VIEW_PASSENGER', 'passenger', `Consultation du passager ${item.fullName} (PNR: ${item.pnr})`, item.id);
          navigation.navigate('PassengerDetail', { id: item.id });
        }}
        style={styles.passengerItem}>
        <Card style={styles.passengerCard} elevated>
          <View style={styles.passengerHeader}>
            <View style={styles.passengerInfo}>
              <Text style={[styles.passengerName, { color: colors.text.primary }]}>{item.fullName}</Text>
              <Text style={[styles.passengerPnr, { color: colors.text.secondary }]}>PNR: {item.pnr}</Text>
            </View>
            <View style={styles.passengerBadges}>
              {boardingStatus?.boarded ? (
                <Badge label="✓ Embarqué" variant="success" />
              ) : (
                <Badge label="Non embarqué" variant="warning" />
              )}
              {!item.synced && (
                <Badge label="⏳ Sync" variant="info" />
              )}
            </View>
          </View>
          
          <View style={styles.passengerDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="airplane-outline" size={16} color={colors.text.secondary} />
              <Text style={[styles.detailText, { color: colors.text.secondary }]}>{item.flightNumber}</Text>
              <Text style={[styles.detailText, { color: colors.text.secondary }]}> • </Text>
              <Text style={[styles.detailText, { color: colors.text.secondary }]}>{item.departure} → {item.arrival}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="bag-outline" size={16} color={colors.text.secondary} />
              <Text style={[styles.detailText, { color: colors.text.secondary }]}>
                {passengerBaggages.length}/{item.baggageCount} bagage{passengerBaggages.length > 1 ? 's' : ''}
              </Text>
              {passengerBaggages.some(b => b.status === 'arrived') && (
                <>
                  <Text style={[styles.detailText, { color: colors.text.secondary }]}> • </Text>
                  <Badge label="Arrivé" variant="success" size="sm" />
                </>
              )}
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color={colors.text.secondary} />
              <Text style={[styles.detailText, { color: colors.text.secondary }]}>
                {new Date(item.checkedInAt).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  }, [boardingStatusesByPassengerId, baggagesByPassengerId, navigation]);

  const renderAuditItem = useCallback(({ item }: { item: AuditLog }) => {
    const getActionIcon = (action: string) => {
      if (action.includes('CHECKIN')) return 'person-add-outline';
      if (action.includes('BAGGAGE') || action.includes('REGISTER')) return 'bag-add-outline';
      if (action.includes('BOARD')) return 'checkmark-circle-outline';
      if (action.includes('ARRIVAL') || action.includes('CONFIRM')) return 'location-outline';
      if (action.includes('EXPORT')) return 'download-outline';
      if (action.includes('VIEW')) return 'eye-outline';
      return 'document-text-outline';
    };

    const getActionColor = (action: string) => {
      if (action.includes('CHECKIN')) return colors.primary.main;
      if (action.includes('BAGGAGE') || action.includes('REGISTER')) return colors.success.main;
      if (action.includes('BOARD')) return colors.success.main;
      if (action.includes('ARRIVAL') || action.includes('CONFIRM')) return colors.warning.main;
      if (action.includes('EXPORT')) return colors.info.main;
      return colors.text.secondary;
    };

    // Fonction pour formater la date de manière sécurisée - utilise TOUJOURS la date stockée
    const formatDate = (dateString: string | null | undefined) => {
      // Convertir en string et nettoyer
      const str = String(dateString || '').trim();
      
      if (!str || str === 'null' || str === 'undefined') {
        // Si pas de date, retourner un message plutôt que la date actuelle
        return 'Date non disponible';
      }

      try {
        // Les dates dans audit_log sont stockées en ISO format (ex: 2024-01-15T10:30:00.000Z)
        // Essayer de parser la date directement
        let date = new Date(str);
        
        // Si la date est invalide, essayer différents formats
        if (isNaN(date.getTime())) {
          // Format ISO avec espace au lieu de T
          date = new Date(str.replace(' ', 'T'));
          if (isNaN(date.getTime())) {
            // Format SQLite datetime (YYYY-MM-DD HH:MM:SS)
            const sqliteMatch = str.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
            if (sqliteMatch) {
              date = new Date(
                parseInt(sqliteMatch[1]),
                parseInt(sqliteMatch[2]) - 1,
                parseInt(sqliteMatch[3]),
                parseInt(sqliteMatch[4]),
                parseInt(sqliteMatch[5]),
                parseInt(sqliteMatch[6])
              );
            }
          }
        }

        // Si toujours invalide, essayer de parser manuellement
        if (isNaN(date.getTime())) {
          // Format simple YYYY-MM-DD
          const simpleMatch = str.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (simpleMatch) {
            const year = parseInt(simpleMatch[1]);
            const month = parseInt(simpleMatch[2]) - 1;
            const day = parseInt(simpleMatch[3]);
            // Valider les valeurs
            if (year >= 1900 && year <= 2100 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
              date = new Date(year, month, day);
            }
          }
        }

        // Si toujours invalide, essayer d'extraire au moins une partie de la date
        if (isNaN(date.getTime())) {
          const parts = str.split(/[-T\s]/).filter(p => /^\d+$/.test(p));
          if (parts.length >= 3) {
            const year = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            const day = parseInt(parts[2]);
            if (year >= 1900 && year <= 2100 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
              date = new Date(year, month, day);
            }
          }
        }

        // Si toujours invalide, retourner la chaîne originale formatée manuellement
        if (isNaN(date.getTime())) {
          // Essayer d'extraire au moins la date
          const dateMatch = str.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (dateMatch) {
            return `${dateMatch[3]}/${dateMatch[2]}/${dateMatch[1]}`;
          }
          return str; // Retourner la chaîne originale si on ne peut pas parser
        }

        return date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      } catch (error) {
        console.error('Error formatting date:', str, error);
        // Retourner la chaîne originale plutôt que la date actuelle
        return str;
      }
    };

    const formatTime = (dateString: string | null | undefined) => {
      // Convertir en string et nettoyer
      const str = String(dateString || '').trim();
      
      if (!str || str === 'null' || str === 'undefined') {
        return 'Heure non disponible';
      }

      try {
        // Essayer de parser la date directement
        let date = new Date(str);
        
        // Si la date est invalide, essayer différents formats
        if (isNaN(date.getTime())) {
          // Format ISO avec espace au lieu de T
          date = new Date(str.replace(' ', 'T'));
          if (isNaN(date.getTime())) {
            // Format SQLite datetime (YYYY-MM-DD HH:MM:SS)
            const sqliteMatch = str.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
            if (sqliteMatch) {
              date = new Date(
                parseInt(sqliteMatch[1]),
                parseInt(sqliteMatch[2]) - 1,
                parseInt(sqliteMatch[3]),
                parseInt(sqliteMatch[4]),
                parseInt(sqliteMatch[5]),
                parseInt(sqliteMatch[6])
              );
            }
          }
        }

        // Si toujours invalide, essayer d'extraire l'heure manuellement
        if (isNaN(date.getTime())) {
          const timeMatch = str.match(/(\d{2}):(\d{2}):?(\d{2})?/);
          if (timeMatch) {
            const hour = parseInt(timeMatch[1]);
            const minute = parseInt(timeMatch[2]);
            // Valider l'heure
            if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
              return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            }
          }
          // Essayer d'extraire depuis un format ISO
          const isoMatch = str.match(/T(\d{2}):(\d{2})/);
          if (isoMatch) {
            const hour = parseInt(isoMatch[1]);
            const minute = parseInt(isoMatch[2]);
            if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
              return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            }
          }
          // Si on peut extraire l'heure, la retourner même si la date est invalide
          const extractedTime = str.match(/(\d{2}):(\d{2})/);
          return extractedTime ? `${extractedTime[1]}:${extractedTime[2]}` : str;
        }

        return date.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch (error) {
        console.error('Error formatting time:', str, error);
        // Essayer d'extraire l'heure de la chaîne originale
        const timeMatch = str.match(/(\d{2}):(\d{2})/);
        return timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : str;
      }
    };

    return (
      <Card style={styles.auditCard}>
        <View style={styles.auditHeader}>
          <View style={styles.auditIconContainer}>
            <Ionicons name={getActionIcon(item.action) as any} size={20} color={getActionColor(item.action)} />
          </View>
          <View style={styles.auditInfo}>
            <Text style={[styles.auditAction, { color: colors.text.primary }]}>{item.action.replace(/_/g, ' ')}</Text>
            <Text style={[styles.auditUser, { color: colors.text.secondary }]}>{item.userEmail}</Text>
          </View>
          <Text style={[styles.auditTime, { color: colors.text.secondary }]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
        <Text style={[styles.auditDetails, { color: colors.text.secondary }]}>{item.details}</Text>
        <Text style={[styles.auditDate, { color: colors.text.secondary }]}>
          {formatDate(item.createdAt)}
        </Text>
      </Card>
    );
  }, [colors]);

  // Mémoriser les statistiques pour éviter les recalculs
  const memoizedStatistics = useMemo(() => statistics, [statistics]);

  const renderOverview = useCallback(() => (
    <ScrollView style={styles.overviewContainer} showsVerticalScrollIndicator={false}>
      {/* Statistiques principales */}
      <View style={styles.mainStatsGrid}>
        <Card style={styles.mainStatCard}>
          <View style={styles.mainStatHeader}>
            <Ionicons name="people-outline" size={32} color={colors.primary.main} />
            <Text style={[styles.mainStatValue, { color: colors.text.primary }]}>{memoizedStatistics.totalPassengers}</Text>
          </View>
          <Text style={[styles.mainStatLabel, { color: colors.text.primary }]}>Total Passagers</Text>
          <View style={styles.mainStatSub}>
            <Text style={[styles.mainStatSubText, { color: colors.text.secondary }]}>Aujourd'hui: {memoizedStatistics.todayPassengers}</Text>
          </View>
        </Card>

        <Card style={styles.mainStatCard}>
          <View style={styles.mainStatHeader}>
            <Ionicons name="bag-outline" size={32} color={colors.success.main} />
            <Text style={[styles.mainStatValue, { color: colors.text.primary }]}>{memoizedStatistics.totalBaggages}</Text>
          </View>
          <Text style={[styles.mainStatLabel, { color: colors.text.primary }]}>Total Bagages</Text>
          <View style={styles.mainStatSub}>
            <Text style={[styles.mainStatSubText, { color: colors.text.secondary }]}>Aujourd'hui: {memoizedStatistics.todayBaggages}</Text>
          </View>
        </Card>
      </View>

      {/* Statistiques détaillées */}
      <Card style={styles.detailsCard}>
        <Text style={[styles.detailsTitle, { color: colors.text.primary }]}>Statistiques détaillées</Text>
        <View style={styles.detailsGrid}>
          <View style={styles.detailStat}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success.main} />
            <Text style={[styles.detailStatValue, { color: colors.text.primary }]}>{memoizedStatistics.boardedPassengers}</Text>
            <Text style={[styles.detailStatLabel, { color: colors.text.secondary }]}>Embarqués</Text>
            <Text style={[styles.detailStatSub, { color: colors.text.secondary }]}>Aujourd'hui: {memoizedStatistics.todayBoarded}</Text>
          </View>
          <View style={styles.detailStat}>
            <Ionicons name="close-circle" size={24} color={colors.warning.main} />
            <Text style={[styles.detailStatValue, { color: colors.text.primary }]}>{memoizedStatistics.notBoardedPassengers}</Text>
            <Text style={[styles.detailStatLabel, { color: colors.text.secondary }]}>Non embarqués</Text>
          </View>
          <View style={styles.detailStat}>
            <Ionicons name="location" size={24} color={colors.success.main} />
            <Text style={[styles.detailStatValue, { color: colors.text.primary }]}>{memoizedStatistics.arrivedBaggages}</Text>
            <Text style={[styles.detailStatLabel, { color: colors.text.secondary }]}>Bagages arrivés</Text>
            <Text style={[styles.detailStatSub, { color: colors.text.secondary }]}>Aujourd'hui: {memoizedStatistics.todayArrived}</Text>
          </View>
          <View style={styles.detailStat}>
            <Ionicons name="airplane" size={24} color={colors.info.main} />
            <Text style={[styles.detailStatValue, { color: colors.text.primary }]}>{memoizedStatistics.inTransitBaggages}</Text>
            <Text style={[styles.detailStatLabel, { color: colors.text.secondary }]}>En transit</Text>
          </View>
        </View>
      </Card>

      {/* Vols */}
      {memoizedStatistics.uniqueFlights.length > 0 && (
        <Card style={styles.flightsCard}>
          <View style={styles.flightsHeader}>
            <Text style={[styles.detailsTitle, { color: colors.text.primary }]}>Vols ({memoizedStatistics.flightsCount})</Text>
            <Badge label={`${memoizedStatistics.flightsCount} vol${memoizedStatistics.flightsCount > 1 ? 's' : ''}`} variant="info" />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.flightsList}>
            {memoizedStatistics.uniqueFlights.slice(0, 10).map((flight, index) => {
              const flightPassengers = passengers.filter(p => p.flightNumber === flight);
              const flightBoarded = boardingStatuses.filter(bs => 
                flightPassengers.some(p => p.id === bs.passengerId && bs.boarded)
              ).length;
              return (
                <View key={index} style={[styles.flightBadge, { backgroundColor: colors.primary.light + '20' }]}>
                  <Text style={[styles.flightNumber, { color: colors.primary.main }]}>{flight}</Text>
                  <Text style={[styles.flightCount, { color: colors.text.secondary }]}>{flightPassengers.length} pax</Text>
                  <Text style={[styles.flightBoarded, { color: colors.success.main }]}>{flightBoarded} embarqués</Text>
                </View>
              );
            })}
          </ScrollView>
        </Card>
      )}

      {/* Alertes */}
      <Card style={styles.alertsCard}>
        <View style={styles.alertsHeader}>
          <Ionicons name="alert-circle-outline" size={24} color={colors.warning.main} />
          <Text style={[styles.detailsTitle, { color: colors.text.primary }]}>Alertes</Text>
        </View>
        <View style={styles.alertsList}>
          {memoizedStatistics.pendingSync > 0 && (
            <View style={styles.alertItem}>
              <Ionicons name="sync-outline" size={20} color={colors.warning.main} />
              <Text style={[styles.alertText, { color: colors.text.primary }]}>
                {memoizedStatistics.pendingSync} élément(s) en attente de synchronisation
              </Text>
            </View>
          )}
          {memoizedStatistics.notBoardedPassengers > 0 && (
            <View style={styles.alertItem}>
              <Ionicons name="warning-outline" size={20} color={colors.warning.main} />
              <Text style={[styles.alertText, { color: colors.text.primary }]}>
                {memoizedStatistics.notBoardedPassengers} passager(s) non embarqué(s)
              </Text>
            </View>
          )}
          {memoizedStatistics.inTransitBaggages > 0 && (
            <View style={styles.alertItem}>
              <Ionicons name="bag-outline" size={20} color={colors.info.main} />
              <Text style={[styles.alertText, { color: colors.text.primary }]}>
                {memoizedStatistics.inTransitBaggages} bagage(s) en transit
              </Text>
            </View>
          )}
          {memoizedStatistics.pendingSync === 0 && memoizedStatistics.notBoardedPassengers === 0 && (
            <Text style={[styles.noAlerts, { color: colors.text.secondary }]}>Aucune alerte</Text>
          )}
        </View>
      </Card>
    </ScrollView>
  ), [statistics, passengers, boardingStatuses]);

  // Log de débogage pour voir l'état actuel
  console.log('[Supervisor] Render - viewMode:', viewMode, 'passengers:', passengers.length, 'filtered:', filteredPassengers.length, 'statistics:', statistics);

  return (
    <View style={[styles.container, { backgroundColor: colors.background.default, paddingTop: insets.top }]}>
      <Toast
        message={toastMessage}
        type={toastType}
        visible={showToast}
        onHide={() => setShowToast(false)}
      />

      {/* Onglets de navigation */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.background.paper, borderBottomColor: colors.border.light }]}>
        <TouchableOpacity
          style={[styles.tab, viewMode === 'overview' && [styles.tabActive, { borderBottomColor: colors.primary.main }]]}
          onPress={() => setViewMode('overview')}
          activeOpacity={0.7}>
          <Ionicons
            name="stats-chart-outline"
            size={20}
            color={viewMode === 'overview' ? colors.primary.main : colors.text.secondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: colors.text.secondary },
              viewMode === 'overview' && [styles.tabTextActive, { color: colors.primary.main }],
            ]}>
            Vue d'ensemble
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, viewMode === 'passengers' && [styles.tabActive, { borderBottomColor: colors.primary.main }]]}
          onPress={() => setViewMode('passengers')}
          activeOpacity={0.7}>
          <Ionicons
            name="people-outline"
            size={20}
            color={viewMode === 'passengers' ? colors.primary.main : colors.text.secondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: colors.text.secondary },
              viewMode === 'passengers' && [styles.tabTextActive, { color: colors.primary.main }],
            ]}>
            Passagers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, viewMode === 'audit' && [styles.tabActive, { borderBottomColor: colors.primary.main }]]}
          onPress={() => setViewMode('audit')}
          activeOpacity={0.7}>
          <Ionicons
            name="document-text-outline"
            size={20}
            color={viewMode === 'audit' ? colors.primary.main : colors.text.secondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: colors.text.secondary },
              viewMode === 'audit' && [styles.tabTextActive, { color: colors.primary.main }],
            ]}>
            Audit
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenu selon l'onglet */}
      {viewMode === 'overview' && renderOverview()}

      {viewMode === 'passengers' && (
        <>
          {/* Liste des passagers */}
          <View style={styles.listContainer}>
            <View style={styles.listHeader}>
              <Text style={[styles.listTitle, { color: colors.text.primary }]}>Passagers ({filteredPassengers.length})</Text>
              <View style={styles.headerActions}>
                {/* Bouton Filtrer */}
                <TouchableOpacity 
                  onPress={openFilterModal} 
                  style={[
                    styles.filterButton,
                    { borderColor: colors.primary.main, backgroundColor: colors.background.paper },
                    (filters.date || filters.route) && [styles.filterButtonActive, { backgroundColor: colors.primary.main }]
                  ]} 
                  activeOpacity={0.7}>
                  <Ionicons 
                    name="filter" 
                    size={20} 
                    color={(filters.date || filters.route) ? colors.primary.contrast : colors.primary.main} 
                  />
                  {(filters.date || filters.route) && (
                    <View style={[styles.filterBadgeDot, { backgroundColor: colors.primary.contrast }]}>
                      <View style={styles.filterBadgeInner} />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={loadAllData} activeOpacity={0.7} style={styles.refreshButton}>
                  <Ionicons name="refresh" size={24} color={colors.primary.main} />
                </TouchableOpacity>
              </View>
            </View>

            {loading && !refreshing ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary.main} />
                <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Chargement...</Text>
              </View>
            ) : filteredPassengers.length === 0 ? (
              <View style={styles.centerContainer}>
                <Ionicons name="people-outline" size={64} color={colors.text.secondary} />
                <Text style={[styles.emptyText, { color: colors.text.primary }]}>Aucun passager trouvé</Text>
                <Text style={[styles.emptySubtext, { color: colors.text.secondary }]}>
                  {Object.values(filters).some(f => f !== '')
                    ? 'Essayez de modifier les filtres'
                    : 'Aucun passager enregistré pour cet aéroport'}
                </Text>
              </View>
            ) : (
              <>
                <FlatList
                  data={filteredPassengers}
                  keyExtractor={(item) => item.id}
                  renderItem={renderPassengerItem}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={() => {
                        setRefreshing(true);
                        loadAllData();
                      }}
                      colors={[colors.primary.main]}
                    />
                  }
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={true}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                  removeClippedSubviews={true}
                  maxToRenderPerBatch={10}
                  updateCellsBatchingPeriod={50}
                  initialNumToRender={10}
                  windowSize={10}
                />
                
                {/* Boutons d'export en bas */}
                <View style={[styles.exportFooter, { backgroundColor: colors.background.default, borderTopColor: colors.border.light }]}>
                  <Button
                    title={exportingEmail ? 'Export Email...' : 'Exporter par Email'}
                    onPress={handleExportEmail}
                    variant="primary"
                    loading={exportingEmail}
                    disabled={exportingEmail || exporting || passengers.length === 0}
                    style={styles.exportButtonFooter}
                    fullWidth
                  />
                  <Button
                    title={exporting ? 'Export Fichier...' : 'Exporter Excel'}
                    onPress={handleExportFile}
                    variant="outline"
                    loading={exporting}
                    disabled={exportingEmail || exporting || passengers.length === 0}
                    style={styles.exportButtonFooter}
                    fullWidth
                  />
                </View>
              </>
            )}
          </View>
        </>
      )}

      {/* Modal de filtres */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeFilterModal}>
        <View style={styles.filterModalOverlay}>
          <View style={[styles.filterModalContainer, { backgroundColor: colors.background.paper }]}>
            {/* Header */}
            <View style={[styles.filterModalHeader, { borderBottomColor: colors.border.light }]}>
              <Text style={[styles.filterModalTitle, { color: colors.text.primary }]}>Filtrer par</Text>
              <View style={styles.filterModalHeaderRight}>
                <TouchableOpacity onPress={resetFiltersInModal} style={styles.filterResetButton}>
                  <Text style={[styles.filterResetText, { color: colors.text.primary }]}>Réinitialiser</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={closeFilterModal} style={styles.filterCloseButton}>
                  <Ionicons name="close" size={24} color={colors.text.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Contenu des filtres */}
            <ScrollView style={styles.filterModalContent} showsVerticalScrollIndicator={true}>
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: colors.text.primary }]}>Filtres disponibles</Text>
                
                <View style={styles.filterItem}>
                  <Text style={[styles.filterLabel, { color: colors.text.primary }]}>Date</Text>
                  <Input
                    placeholder="YYYY-MM-DD"
                    value={tempFilters.date}
                    onChangeText={(text) => setTempFilters({ ...tempFilters, date: text })}
                    style={styles.filterInput}
                  />
                </View>

                <View style={styles.filterItem}>
                  <Text style={[styles.filterLabel, { color: colors.text.primary }]}>Destination</Text>
                  <TouchableOpacity
                    onPress={() => {
                      console.log('[Supervisor] Opening route modal, assignedAirport:', assignedAirport);
                      const destinations = getAvailableDestinations();
                      console.log('[Supervisor] Available destinations:', destinations.length, destinations);
                      if (destinations.length === 0) {
                        Alert.alert(
                          'Aucune destination',
                          assignedAirport 
                            ? 'Aucune destination disponible pour cet aéroport.'
                            : 'Aéroport non assigné. Veuillez attendre que l\'aéroport soit assigné.'
                        );
                        return;
                      }
                      // Fermer temporairement le modal de filtres pour permettre l'affichage du modal de sélection
                      setFilterModalVisible(false);
                      // Attendre un peu pour que le modal de filtres se ferme avant d'ouvrir le modal de sélection
                      setTimeout(() => {
                        setRouteModalVisible(true);
                      }, 300);
                    }}
                    style={[styles.routeSelectButton, { borderColor: colors.border.main }]}
                    activeOpacity={0.7}>
                    <Text
                      style={[
                        styles.routeSelectText,
                        { color: colors.text.primary },
                        !tempFilters.route && [styles.routeSelectPlaceholder, { color: colors.text.secondary }],
                      ]}>
                      {tempFilters.route
                        ? getDestinationName(tempFilters.route)
                        : 'Sélectionner une destination'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
                  </TouchableOpacity>
                  {assignedAirport && (
                    <Text style={[styles.filterHint, { color: colors.text.secondary }]}>
                      Origine: {AIRPORTS.find(a => a.code === assignedAirport)?.name || assignedAirport}
                    </Text>
                  )}
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={[styles.filterModalFooter, { borderTopColor: colors.border.light }]}>
              <Text style={[styles.filterResultsCount, { color: colors.text.primary }]}>
                {getFilteredCount(tempFilters)} passager{getFilteredCount(tempFilters) > 1 ? 's' : ''} correspondant{getFilteredCount(tempFilters) > 1 ? 's' : ''}
              </Text>
              <Button
                title="Montrer les résultats"
                onPress={applyFiltersFromModal}
                variant="primary"
                fullWidth
                style={styles.filterApplyButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de sélection de destination */}
      {routeModalVisible && (
        <SelectModal
          visible={routeModalVisible}
          title="Sélectionner une destination"
          options={getAvailableDestinations()}
          selectedValue={tempFilters.route}
          onSelect={(value) => {
            console.log('[Supervisor] Destination selected:', value);
            setTempFilters({ ...tempFilters, route: value });
            setRouteModalVisible(false);
            // Rouvrir le modal de filtres après la sélection
            setTimeout(() => {
              setFilterModalVisible(true);
            }, 300);
          }}
          onClose={() => {
            console.log('[Supervisor] Route modal closed');
            setRouteModalVisible(false);
            // Rouvrir le modal de filtres si on ferme sans sélectionner
            setTimeout(() => {
              setFilterModalVisible(true);
            }, 300);
          }}
        />
      )}

      {viewMode === 'audit' && (
        <View style={styles.listContainer}>
          <View style={styles.listHeader}>
            <View style={styles.listHeaderTextContainer}>
              <Text style={[styles.listTitle, { color: colors.text.primary }]}>Logs d'audit ({auditLogs.length})</Text>
              <Text style={[styles.listSubtitle, { color: colors.text.secondary }]}>Tous les agents de l'aéroport</Text>
            </View>
            <TouchableOpacity onPress={loadAllData} activeOpacity={0.7}>
              <Ionicons name="refresh" size={24} color={colors.primary.main} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.primary.main} />
              <Text style={styles.loadingText}>Chargement...</Text>
            </View>
          ) : auditLogs.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="document-text-outline" size={64} color={colors.text.secondary} />
              <Text style={[styles.emptyText, { color: colors.text.primary }]}>Aucun log d'audit</Text>
            </View>
          ) : (
            <FlatList
              data={auditLogs}
              keyExtractor={(item) => item.id}
              renderItem={renderAuditItem}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    loadAllData();
                  }}
                  colors={[Colors.primary.main]}
                />
              }
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={true}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              updateCellsBatchingPeriod={50}
              initialNumToRender={10}
              windowSize={10}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    // borderBottomColor will be set dynamically
  },
  tabText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  tabTextActive: {
    fontWeight: FontWeights.bold,
  },
  overviewContainer: {
    flex: 1,
    padding: Spacing.md,
  },
  mainStatsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  mainStatCard: {
    flex: 1,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  mainStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  mainStatValue: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
  },
  mainStatLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.xs,
  },
  mainStatSub: {
    marginTop: Spacing.xs,
  },
  mainStatSubText: {
    fontSize: FontSizes.xs,
  },
  detailsCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  detailsTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.md,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  detailStat: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 8,
  },
  detailStatValue: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    marginTop: Spacing.xs,
  },
  detailStatLabel: {
    fontSize: FontSizes.sm,
    marginTop: Spacing.xs / 2,
    fontWeight: FontWeights.medium,
  },
  detailStatSub: {
    fontSize: FontSizes.xs,
    marginTop: Spacing.xs / 2,
  },
  flightsCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  flightsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  flightsList: {
    marginTop: Spacing.sm,
  },
  flightBadge: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  flightNumber: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
  flightCount: {
    fontSize: FontSizes.xs,
    marginTop: Spacing.xs / 2,
  },
  flightBoarded: {
    fontSize: FontSizes.xs,
    marginTop: Spacing.xs / 2,
    fontWeight: FontWeights.medium,
  },
  alertsCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  alertsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  alertsList: {
    gap: Spacing.sm,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: 8,
  },
  alertText: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  noAlerts: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
    padding: Spacing.md,
    fontStyle: 'italic',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingTop: Spacing.sm,
  },
  listTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    gap: Spacing.xs,
  },
  filterButtonActive: {
  },
  filterBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: -Spacing.xs / 2,
  },
  filterBadgeInner: {
    flex: 1,
  },
  refreshButton: {
    padding: Spacing.xs,
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContainer: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    flex: 1,
    minHeight: '85%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  filterModalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  filterModalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  filterResetButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  filterResetText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  filterCloseButton: {
    padding: Spacing.xs,
  },
  filterModalContent: {
    flex: 1,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  filterSection: {
    marginBottom: Spacing.lg,
  },
  filterSectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.md,
  },
  filterItem: {
    marginBottom: Spacing.lg,
  },
  filterLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.sm,
  },
  filterInput: {
    marginBottom: 0,
  },
  filterHint: {
    fontSize: FontSizes.xs,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  routeSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    minHeight: 48,
  },
  routeSelectText: {
    fontSize: FontSizes.md,
    flex: 1,
  },
  routeSelectPlaceholder: {
  },
  filterModalFooter: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  filterResultsCount: {
    fontSize: FontSizes.md,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  filterApplyButton: {
    marginBottom: 0,
  },
  exportFooter: {
    padding: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  exportButtonFooter: {
    marginBottom: 0,
  },
  listSubtitle: {
    fontSize: FontSizes.sm,
    marginTop: Spacing.xs / 2,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  passengerItem: {
    marginBottom: Spacing.sm,
  },
  passengerCard: {
    padding: Spacing.md,
  },
  passengerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  passengerInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  passengerName: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.xs / 2,
  },
  passengerPnr: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    fontFamily: 'monospace',
  },
  passengerBadges: {
    flexDirection: 'row',
    gap: Spacing.xs,
    alignItems: 'flex-start',
  },
  syncBadge: {
    marginTop: 0,
  },
  passengerDetails: {
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  auditCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  auditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  auditIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  auditInfo: {
    flex: 1,
  },
  auditAction: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  auditUser: {
    fontSize: FontSizes.xs,
    marginTop: Spacing.xs / 4,
  },
  auditTime: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
  },
  auditDetails: {
    fontSize: FontSizes.sm,
    marginBottom: Spacing.xs,
    lineHeight: 20,
  },
  auditDate: {
    fontSize: FontSizes.xs,
  },
  separator: {
    height: Spacing.sm,
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
    fontWeight: FontWeights.medium,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
});
