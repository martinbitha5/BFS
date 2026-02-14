import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Badge from '../components/Badge';
import Card from '../components/Card';
import StatusIndicator from '../components/StatusIndicator';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/RootStack';
import { authServiceInstance, databaseServiceInstance, syncService } from '../services';
import { BorderRadius, FontSizes, FontWeights, Spacing } from '../theme';
import { User } from '../types/user.types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const ROLE_LABELS: Record<string, string> = {
  checkin: 'Check-in',
  baggage: 'Bagages',
  boarding: 'Embarquement',
  arrival: 'Arrivée',
  supervisor: 'Superviseur',
  rush: 'Agent RUSH',
  delivery: 'Livraison',
};

const ROLE_COLORS: Record<string, 'primary' | 'success' | 'info' | 'warning' | 'secondary' | 'error'> = {
  checkin: 'primary',
  baggage: 'success',
  boarding: 'info',
  arrival: 'warning',
  supervisor: 'secondary',
  rush: 'error',
  delivery: 'success',
};

export default function HomeScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<User | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [isRushAgent, setIsRushAgent] = useState(false);

  useEffect(() => {
    loadUser();
    loadSyncStatus();
    
    // ✅ DÉMARRER LA SYNCHRONISATION AUTOMATIQUE
    syncService.startAutoSync().catch(error => {
      console.error('[Home] Erreur démarrage auto-sync:', error);
    });
    
    // Vérifier le statut de synchronisation périodiquement
    const interval = setInterval(loadSyncStatus, 5000);
    
    return () => {
      clearInterval(interval);
      // Arrêter la sync quand on quitte l'écran principal
      // syncService.stopAutoSync();
    };
  }, []);

  const loadUser = async () => {
    const currentUser = await authServiceInstance.getCurrentUser();
    setUser(currentUser);
    setIsRushAgent(currentUser?.role === 'rush');
  };

  const loadSyncStatus = async () => {
    try {
      // Pour l'instant, on considère toujours en ligne (sera amélioré avec NetInfo)
      setIsOnline(true);
      
      // Compter les éléments en attente de synchronisation
      const pendingItems = await databaseServiceInstance.getPendingSyncItems(100);
      setPendingSync(pendingItems.length);
    } catch (error) {
      console.error('Error loading sync status:', error);
      setIsOnline(false);
    }
  };

  if (!user) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background.default }]}>
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background.default }]} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}>
      <View style={[styles.content, { paddingTop: insets.top + Spacing.lg }]}>
        {/* Profil utilisateur */}
        <Card style={styles.profileCard}>
          <View style={styles.profileSection}>
            <View style={[styles.avatar, { backgroundColor: colors.primary.light + '15', borderColor: colors.primary.light + '30' }]}>
              <Text style={[styles.avatarText, { color: colors.primary.main }]}>
                {user.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .substring(0, 2)}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.userName, { color: colors.text.primary }]}>{user.fullName}</Text>
              <View style={styles.badgeContainer}>
                <Badge label={ROLE_LABELS[user.role]} variant={ROLE_COLORS[user.role]} />
                <Badge label={user.airportCode} variant="info" />
              </View>
            </View>
          </View>
        </Card>
        <Card style={styles.welcomeCard}>
          <View style={styles.welcomeHeader}>
            <View style={styles.welcomeTextContainer}>
              <Text style={[styles.welcomeTitle, { color: colors.text.primary }]}>Bienvenue sur Police Bagages</Text>
              <Text style={[styles.welcomeText, { color: colors.text.secondary }]}>
                Système de gestion des bagages aéroportuaires
              </Text>
            </View>
            <StatusIndicator
              online={isOnline}
              syncing={syncing}
              pendingSync={pendingSync}
            />
          </View>
        </Card>

        <View style={styles.menu}>
          {user.role === 'checkin' && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Checkin')}>
              <Card style={styles.menuCard} elevated>
                <View style={styles.menuCardContent}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.primary.light + '15' }]}>
                    <Ionicons name="checkmark-circle" size={28} color={colors.primary.main} />
                  </View>
                  <View style={styles.menuCardText}>
                    <Text style={[styles.menuCardTitle, { color: colors.text.primary }]}>Check-in</Text>
                    <Text style={[styles.menuCardDescription, { color: colors.text.secondary }]}>Enregistrement des passagers</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
                </View>
              </Card>
            </TouchableOpacity>
          )}

          {user.role === 'baggage' && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Baggage')}>
              <Card style={styles.menuCard} elevated>
                <View style={styles.menuCardContent}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.success.light + '15' }]}>
                    <Ionicons name="bag" size={28} color={colors.success.main} />
                  </View>
                  <View style={styles.menuCardText}>
                    <Text style={[styles.menuCardTitle, { color: colors.text.primary }]}>Gestion des Bagages</Text>
                    <Text style={[styles.menuCardDescription, { color: colors.text.secondary }]}>Scan et enregistrement des bagages</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
                </View>
              </Card>
            </TouchableOpacity>
          )}

          {user.role === 'boarding' && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Boarding')}>
              <Card style={styles.menuCard} elevated>
                <View style={styles.menuCardContent}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.info.light + '15' }]}>
                    <Ionicons name="airplane" size={28} color={colors.info.main} />
                  </View>
                  <View style={styles.menuCardText}>
                    <Text style={[styles.menuCardTitle, { color: colors.text.primary }]}>Embarquement</Text>
                    <Text style={[styles.menuCardDescription, { color: colors.text.secondary }]}>Validation de l'embarquement</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
                </View>
              </Card>
            </TouchableOpacity>
          )}

          {user.role === 'rush' && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Rush' as any)}>
              <Card style={styles.menuCard} elevated>
                <View style={styles.menuCardContent}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.error.light + '15' }]}>
                    <Ionicons name="warning" size={28} color={colors.error.main} />
                  </View>
                  <View style={styles.menuCardText}>
                    <Text style={[styles.menuCardTitle, { color: colors.text.primary }]}>Gestion RUSH</Text>
                    <Text style={[styles.menuCardDescription, { color: colors.text.secondary }]}>Scanner et déclarer les bagages RUSH</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
                </View>
              </Card>
            </TouchableOpacity>
          )}

          {user.role === 'delivery' && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Delivery' as any)}>
              <Card style={styles.menuCard} elevated>
                <View style={styles.menuCardContent}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.success.light + '15' }]}>
                    <Ionicons name="checkmark-done" size={28} color={colors.success.main} />
                  </View>
                  <View style={styles.menuCardText}>
                    <Text style={[styles.menuCardTitle, { color: colors.text.primary }]}>Livraison des Bagages</Text>
                    <Text style={[styles.menuCardDescription, { color: colors.text.secondary }]}>Confirmer la récupération des bagages</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
                </View>
              </Card>
            </TouchableOpacity>
          )}

          {user.role === 'arrival' && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Arrival')}>
              <Card style={styles.menuCard} elevated>
                <View style={styles.menuCardContent}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.warning.light + '15' }]}>
                    <Ionicons name="location" size={28} color={colors.warning.main} />
                  </View>
                  <View style={styles.menuCardText}>
                    <Text style={[styles.menuCardTitle, { color: colors.text.primary }]}>Arrivée des Bagages</Text>
                    <Text style={[styles.menuCardDescription, { color: colors.text.secondary }]}>Confirmation de l'arrivée</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
                </View>
              </Card>
            </TouchableOpacity>
          )}

          {/* Lien vers Paramètres */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Settings')}>
            <Card style={styles.menuCard} elevated>
              <View style={styles.menuCardContent}>
                <View style={[styles.iconContainer, { backgroundColor: colors.secondary.light + '15' }]}>
                  <Ionicons name="settings-outline" size={28} color={colors.secondary.main} />
                </View>
                <View style={styles.menuCardText}>
                  <Text style={[styles.menuCardTitle, { color: colors.text.primary }]}>Paramètres</Text>
                  <Text style={[styles.menuCardDescription, { color: colors.text.secondary }]}>Gérer vos préférences</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
              </View>
            </Card>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FontSizes.md,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: BorderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
    borderWidth: 2,
  },
  avatarText: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  userName: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    letterSpacing: -0.3,
  },
  content: {
    padding: Spacing.lg,
    flex: 1,
  },
  profileCard: {
    marginBottom: Spacing.xl,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  welcomeCard: {
    marginBottom: Spacing.xl,
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.xs,
    letterSpacing: -0.5,
  },
  welcomeText: {
    fontSize: FontSizes.md,
    lineHeight: 24,
  },
  menu: {
    gap: Spacing.lg,
  },
  menuCard: {
    marginBottom: 0,
  },
  menuCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  menuCardText: {
    flex: 1,
  },
  menuCardTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.xs,
    letterSpacing: -0.3,
  },
  menuCardDescription: {
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
});
