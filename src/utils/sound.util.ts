import { Audio } from 'expo-av';

let soundObject: Audio.Sound | null = null;

/**
 * Joue un son de scan automatique
 */
export const playScanSound = async (): Promise<void> => {
  try {
    // Créer un son de bip court (fréquence 800Hz, durée 100ms)
    // Utiliser le système de son natif pour un son de scan rapide
    if (soundObject) {
      await soundObject.unloadAsync();
    }

    // Créer un son de scan simple avec expo-av
    // Note: Pour un son personnalisé, vous pouvez ajouter un fichier audio dans assets/sounds/
    // Pour l'instant, on utilise un son système simple
    
    // Pour React Native, on peut utiliser un son système simple
    // ou créer un son programmatiquement avec expo-av
    
    // Solution simple: utiliser un son système via haptics pour le feedback
    // Mais pour un vrai son, on peut utiliser un fichier audio ou générer un son
    
    // Pour l'instant, on va utiliser un son système simple
    // Vous pouvez remplacer cela par un fichier audio si nécessaire
    
    // Note: expo-av nécessite un fichier audio pour jouer un son
    // Pour un son de scan rapide, on peut utiliser expo-haptics pour le feedback tactile
    // et générer un son système si possible
    
    // Solution temporaire: utiliser haptics pour le feedback
    const { impactAsync, ImpactFeedbackStyle } = await import('expo-haptics');
    await impactAsync(ImpactFeedbackStyle.Medium);
    
    // Pour un vrai son, vous pouvez ajouter un fichier .mp3 ou .wav dans assets/sounds/scan.mp3
    // et utiliser:
    // const { sound } = await Audio.Sound.createAsync(require('../../assets/sounds/scan.mp3'));
    // await sound.playAsync();
    
  } catch (error) {
    console.error('Error playing scan sound:', error);
    // Ne pas bloquer le scan si le son échoue
  }
};

/**
 * Joue un son de succès
 */
export const playSuccessSound = async (): Promise<void> => {
  try {
    const { impactAsync, ImpactFeedbackStyle } = await import('expo-haptics');
    await impactAsync(ImpactFeedbackStyle.Heavy);
  } catch (error) {
    console.error('Error playing success sound:', error);
  }
};

/**
 * Joue un son d'erreur
 */
export const playErrorSound = async (): Promise<void> => {
  try {
    const { notificationAsync, NotificationFeedbackType } = await import('expo-haptics');
    await notificationAsync(NotificationFeedbackType.Error);
  } catch (error) {
    console.error('Error playing error sound:', error);
  }
};

/**
 * Nettoie les ressources audio
 */
export const cleanupSound = async (): Promise<void> => {
  try {
    if (soundObject) {
      await soundObject.unloadAsync();
      soundObject = null;
    }
  } catch (error) {
    console.error('Error cleaning up sound:', error);
  }
};

