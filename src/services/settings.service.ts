import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  NOTIFICATIONS_ENABLED: '@bfs:notifications_enabled',
  AUTO_SYNC_ENABLED: '@bfs:auto_sync_enabled',
  DARK_MODE_ENABLED: '@bfs:dark_mode_enabled',
};

export interface AppSettings {
  notificationsEnabled: boolean;
  autoSyncEnabled: boolean;
  darkModeEnabled: boolean;
}

class SettingsService {
  private defaultSettings: AppSettings = {
    notificationsEnabled: true,
    autoSyncEnabled: true,
    darkModeEnabled: false,
  };

  /**
   * Charge les paramètres depuis le stockage local
   */
  async loadSettings(): Promise<AppSettings> {
    try {
      const [notifications, autoSync, darkMode] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED),
        AsyncStorage.getItem(STORAGE_KEYS.AUTO_SYNC_ENABLED),
        AsyncStorage.getItem(STORAGE_KEYS.DARK_MODE_ENABLED),
      ]);

      return {
        notificationsEnabled: notifications !== null ? JSON.parse(notifications) : this.defaultSettings.notificationsEnabled,
        autoSyncEnabled: autoSync !== null ? JSON.parse(autoSync) : this.defaultSettings.autoSyncEnabled,
        darkModeEnabled: darkMode !== null ? JSON.parse(darkMode) : this.defaultSettings.darkModeEnabled,
      };
    } catch (error) {
      console.error('Error loading settings:', error);
      return this.defaultSettings;
    }
  }

  /**
   * Sauvegarde les paramètres dans le stockage local
   */
  async saveSettings(settings: Partial<AppSettings>): Promise<void> {
    try {
      const updates: Promise<void>[] = [];

      if (settings.notificationsEnabled !== undefined) {
        updates.push(
          AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED, JSON.stringify(settings.notificationsEnabled))
        );
      }

      if (settings.autoSyncEnabled !== undefined) {
        updates.push(
          AsyncStorage.setItem(STORAGE_KEYS.AUTO_SYNC_ENABLED, JSON.stringify(settings.autoSyncEnabled))
        );
      }

      if (settings.darkModeEnabled !== undefined) {
        updates.push(
          AsyncStorage.setItem(STORAGE_KEYS.DARK_MODE_ENABLED, JSON.stringify(settings.darkModeEnabled))
        );
      }

      await Promise.all(updates);
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  /**
   * Met à jour un paramètre spécifique
   */
  async updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
    await this.saveSettings({ [key]: value });
  }

  /**
   * Réinitialise tous les paramètres aux valeurs par défaut
   */
  async resetSettings(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED),
        AsyncStorage.removeItem(STORAGE_KEYS.AUTO_SYNC_ENABLED),
        AsyncStorage.removeItem(STORAGE_KEYS.DARK_MODE_ENABLED),
      ]);
    } catch (error) {
      console.error('Error resetting settings:', error);
      throw error;
    }
  }
}

export const settingsService = new SettingsService();

