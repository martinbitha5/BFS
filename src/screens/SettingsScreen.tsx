import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Badge from '../components/Badge';
import Card from '../components/Card';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/RootStack';
import { authServiceInstance, settingsService } from '../services';
import { BorderRadius, FontSizes, FontWeights, Spacing } from '../theme';
import { User } from '../types/user.types';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const ROLE_LABELS: Record<string, string> = {
  checkin: 'Check-in',
  baggage: 'Bagages',
  boarding: 'Embarquement',
  arrival: 'Arrivée',
  supervisor: 'Superviseur',
};

const ROLE_COLORS: Record<string, 'primary' | 'success' | 'info' | 'warning' | 'secondary'> = {
  checkin: 'primary',
  baggage: 'success',
  boarding: 'info',
  arrival: 'warning',
  supervisor: 'secondary',
};

export default function SettingsScreen({ navigation }: Props) {
  const { colors, mode, setMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<User | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [currentUser, settings] = await Promise.all([
        authServiceInstance.getCurrentUser(),
        settingsService.loadSettings(),
      ]);
      setUser(currentUser);
      setNotificationsEnabled(settings.notificationsEnabled);
      setAutoSyncEnabled(settings.autoSyncEnabled);
      setDarkModeEnabled(settings.darkModeEnabled);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationsToggle = async (value: boolean) => {
    try {
      setNotificationsEnabled(value);
      await settingsService.updateSetting('notificationsEnabled', value);
      // Ici vous pouvez ajouter la logique pour activer/désactiver les notifications push
      // Par exemple: await Notifications.setNotificationEnabledAsync(value);
    } catch (error) {
      console.error('Error updating notifications:', error);
      setNotificationsEnabled(!value); // Revert on error
      Alert.alert('Erreur', 'Impossible de mettre à jour les paramètres de notifications');
    }
  };

  const handleAutoSyncToggle = async (value: boolean) => {
    try {
      setAutoSyncEnabled(value);
      await settingsService.updateSetting('autoSyncEnabled', value);
      // Ici vous pouvez ajouter la logique pour activer/désactiver la synchronisation automatique
      // Par exemple: syncService.setAutoSyncEnabled(value);
    } catch (error) {
      console.error('Error updating auto sync:', error);
      setAutoSyncEnabled(!value); // Revert on error
      Alert.alert('Erreur', 'Impossible de mettre à jour les paramètres de synchronisation');
    }
  };

  const handleDarkModeToggle = async (value: boolean) => {
    try {
      setDarkModeEnabled(value);
      await setMode(value ? 'dark' : 'light');
    } catch (error) {
      console.error('Error updating dark mode:', error);
      setDarkModeEnabled(!value); // Revert on error
      Alert.alert('Erreur', 'Impossible de mettre à jour le thème');
    }
  };

  const handleContactSupport = () => {
    const email = 'support@bfs-app.com';
    const subject = encodeURIComponent('Support BFS - Demande d\'assistance');
    const body = encodeURIComponent('Bonjour,\n\nJe souhaite obtenir de l\'aide concernant...\n\n');
    const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;

    Linking.canOpenURL(mailtoUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(mailtoUrl);
        } else {
          Alert.alert(
            'Email non disponible',
            `Veuillez envoyer un email à ${email}`,
            [{ text: 'OK' }]
          );
        }
      })
      .catch((err) => {
        console.error('Error opening email:', err);
        Alert.alert(
          'Erreur',
          'Impossible d\'ouvrir l\'application email',
          [{ text: 'OK' }]
        );
      });
  };

  const handleLogout = async () => {
    try {
      const { logAudit } = await import('../utils/audit.util');
      await logAudit(
        'LOGOUT',
        'system',
        `Déconnexion de l'agent: ${user?.fullName} (${user?.email})`
      );
    } catch (error) {
      console.error('Error logging logout:', error);
    }
    
    await authServiceInstance.logout();
    navigation.replace('Login');
  };

  if (!user || isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background.default }]}>
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background.default }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.content, { paddingTop: insets.top + Spacing.lg }]}>
        {/* Profil utilisateur */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Profil</Text>
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
              <Text style={[styles.profileName, { color: colors.text.primary }]}>{user.fullName}</Text>
              <Text style={[styles.profileEmail, { color: colors.text.secondary }]}>{user.email}</Text>
              <View style={styles.badgeContainer}>
                <Badge label={ROLE_LABELS[user.role]} variant={ROLE_COLORS[user.role]} />
                <Badge label={user.airportCode} variant="info" />
              </View>
            </View>
          </View>
        </Card>

        {/* Paramètres de l'application */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Paramètres de l'application</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={24} color={colors.primary.main} />
              <View style={styles.settingText}>
                <Text style={[styles.settingLabel, { color: colors.text.primary }]}>Notifications</Text>
                <Text style={[styles.settingDescription, { color: colors.text.secondary }]}>Recevoir les notifications push</Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              trackColor={{ false: colors.border.main, true: colors.primary.light }}
              thumbColor={notificationsEnabled ? colors.primary.main : colors.border.dark}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border.light }]} />

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="sync-outline" size={24} color={colors.primary.main} />
              <View style={styles.settingText}>
                <Text style={[styles.settingLabel, { color: colors.text.primary }]}>Synchronisation automatique</Text>
                <Text style={[styles.settingDescription, { color: colors.text.secondary }]}>Synchroniser automatiquement les données</Text>
              </View>
            </View>
            <Switch
              value={autoSyncEnabled}
              onValueChange={handleAutoSyncToggle}
              trackColor={{ false: colors.border.main, true: colors.primary.light }}
              thumbColor={autoSyncEnabled ? colors.primary.main : colors.border.dark}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border.light }]} />

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="moon-outline" size={24} color={colors.primary.main} />
              <View style={styles.settingText}>
                <Text style={[styles.settingLabel, { color: colors.text.primary }]}>Mode sombre</Text>
                <Text style={[styles.settingDescription, { color: colors.text.secondary }]}>Activer le thème sombre</Text>
              </View>
            </View>
            <Switch
              value={darkModeEnabled}
              onValueChange={handleDarkModeToggle}
              trackColor={{ false: colors.border.main, true: colors.primary.light }}
              thumbColor={darkModeEnabled ? colors.primary.main : colors.border.dark}
            />
          </View>
        </Card>

        {/* Liens utiles */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Aide et support</Text>
          
          <TouchableOpacity
            style={styles.linkItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('FAQ')}>
            <View style={styles.linkLeft}>
              <Ionicons name="help-circle-outline" size={24} color={colors.primary.main} />
              <Text style={[styles.linkLabel, { color: colors.text.primary }]}>FAQ</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border.light }]} />

          <TouchableOpacity
            style={styles.linkItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Legal')}>
            <View style={styles.linkLeft}>
              <Ionicons name="document-text-outline" size={24} color={colors.primary.main} />
              <Text style={[styles.linkLabel, { color: colors.text.primary }]}>Mentions légales</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border.light }]} />

          <TouchableOpacity
            style={styles.linkItem}
            activeOpacity={0.7}
            onPress={handleContactSupport}>
            <View style={styles.linkLeft}>
              <Ionicons name="mail-outline" size={24} color={colors.primary.main} />
              <Text style={[styles.linkLabel, { color: colors.text.primary }]}>Contact support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>

        </Card>

        {/* Informations sur l'application */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>À propos</Text>
          
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>Version</Text>
            <Text style={[styles.infoValue, { color: colors.text.primary }]}>1.0.0</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border.light }]} />

          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>Build</Text>
            <Text style={[styles.infoValue, { color: colors.text.primary }]}>2024.01</Text>
          </View>
        </Card>

        {/* Déconnexion */}
        <Card style={styles.logoutCard}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleLogout}
            style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color={colors.error.main} />
            <Text style={[styles.logoutText, { color: colors.error.main }]}>Déconnexion</Text>
          </TouchableOpacity>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FontSizes.md,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.lg,
    letterSpacing: -0.3,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
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
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.xs,
    letterSpacing: -0.3,
  },
  profileEmail: {
    fontSize: FontSizes.md,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  settingLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.xs,
    letterSpacing: -0.1,
  },
  settingDescription: {
    fontSize: FontSizes.sm,
    lineHeight: 18,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  linkLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    marginLeft: Spacing.md,
    letterSpacing: -0.1,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  infoLabel: {
    fontSize: FontSizes.md,
  },
  infoValue: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    letterSpacing: 0.1,
  },
  logoutCard: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  logoutText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
});

