import { UserRole } from '../types/user.types';

export interface ScanResultMessage {
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

/**
 * Obtient le message d'alerte selon le rôle et le résultat du scan
 */
export const getScanResultMessage = (
  role: UserRole,
  action: 'checkin' | 'boarding' | 'baggage' | 'arrival',
  success: boolean,
  details?: {
    passengerName?: string;
    pnr?: string;
    flightNumber?: string;
    baggageCount?: number;
    scannedCount?: number;
  }
): ScanResultMessage => {
  if (!success) {
    return {
      title: 'Erreur',
      message: 'Une erreur est survenue lors du traitement',
      type: 'error',
    };
  }

  switch (role) {
    case 'checkin':
      if (action === 'checkin') {
        return {
          title: 'Enregistré',
          message: details?.passengerName
            ? `Passager ${details.passengerName} enregistré avec succès${details.pnr ? ` (PNR: ${details.pnr})` : ''}`
            : 'Passager enregistré avec succès',
          type: 'success',
        };
      }
      break;

    case 'baggage':
      if (action === 'baggage') {
        if (details?.scannedCount !== undefined && details?.baggageCount !== undefined) {
          const remaining = details.baggageCount - details.scannedCount;
          if (remaining === 0) {
            return {
              title: 'Tous les bagages scannés',
              message: `Tous les bagages (${details.baggageCount}) ont été enregistrés pour ${details.passengerName || 'ce passager'}`,
              type: 'success',
            };
          } else {
            return {
              title: 'Bagage enregistré',
              message: `Bagage enregistré (${details.scannedCount}/${details.baggageCount} restants)`,
              type: 'success',
            };
          }
        }
        return {
          title: 'Bagage enregistré',
          message: 'Bagage enregistré avec succès',
          type: 'success',
        };
      }
      break;

    case 'boarding':
      if (action === 'boarding') {
        return {
          title: 'Embarqué',
          message: details?.passengerName
            ? `Passager ${details.passengerName} embarqué avec succès${details.flightNumber ? ` - Vol ${details.flightNumber}` : ''}`
            : 'Passager embarqué avec succès',
          type: 'success',
        };
      }
      break;

    case 'arrival':
      if (action === 'arrival') {
        return {
          title: 'Arrivée confirmée',
          message: details?.passengerName
            ? `Bagage de ${details.passengerName} marqué comme arrivé`
            : 'Bagage marqué comme arrivé',
          type: 'success',
        };
      }
      break;

    default:
      break;
  }

  // Message par défaut
  return {
    title: 'Succès',
    message: 'Opération effectuée avec succès',
    type: 'success',
  };
};

/**
 * Obtient le message d'erreur selon le rôle
 */
export const getScanErrorMessage = (
  role: UserRole,
  action: 'checkin' | 'boarding' | 'baggage' | 'arrival',
  errorType: 'duplicate' | 'not_found' | 'wrong_airport' | 'not_checked_in' | 'already_processed' | 'unknown'
): ScanResultMessage => {
  switch (role) {
    case 'checkin':
      if (action === 'checkin') {
        switch (errorType) {
          case 'duplicate':
            return {
              title: 'Déjà enregistré',
              message: 'Ce passager a déjà été enregistré',
              type: 'warning',
            };
          case 'wrong_airport':
            return {
              title: 'Erreur',
              message: 'Ce vol ne concerne pas votre aéroport',
              type: 'error',
            };
          default:
            return {
              title: 'Erreur',
              message: 'Erreur lors de l\'enregistrement du passager',
              type: 'error',
            };
        }
      }
      break;

    case 'baggage':
      if (action === 'baggage') {
        switch (errorType) {
          case 'not_checked_in':
            return {
              title: 'Erreur',
              message: 'Ce passager n\'est pas encore enregistré. Effectuez d\'abord le check-in.',
              type: 'error',
            };
          case 'duplicate':
            return {
              title: 'Déjà scanné',
              message: 'Ce tag RFID est déjà enregistré',
              type: 'warning',
            };
          default:
            return {
              title: 'Erreur',
              message: 'Erreur lors de l\'enregistrement du bagage',
              type: 'error',
            };
        }
      }
      break;

    case 'boarding':
      if (action === 'boarding') {
        switch (errorType) {
          case 'not_checked_in':
            return {
              title: 'Erreur',
              message: 'Ce passager n\'est pas encore enregistré. Effectuez d\'abord le check-in.',
              type: 'error',
            };
          case 'wrong_airport':
            return {
              title: 'Erreur',
              message: 'Ce vol ne concerne pas votre aéroport',
              type: 'error',
            };
          case 'already_processed':
            return {
              title: 'Déjà embarqué',
              message: 'Ce passager a déjà été embarqué',
              type: 'warning',
            };
          default:
            return {
              title: 'Erreur',
              message: 'Erreur lors de l\'embarquement',
              type: 'error',
            };
        }
      }
      break;

    case 'arrival':
      if (action === 'arrival') {
        switch (errorType) {
          case 'not_found':
            return {
              title: 'Non trouvé',
              message: 'Aucun bagage trouvé avec ce tag RFID',
              type: 'error',
            };
          case 'wrong_airport':
            return {
              title: 'Erreur',
              message: 'Ce bagage ne concerne pas votre aéroport',
              type: 'error',
            };
          case 'already_processed':
            return {
              title: 'Déjà arrivé',
              message: 'Ce bagage a déjà été marqué comme arrivé',
              type: 'warning',
            };
          default:
            return {
              title: 'Erreur',
              message: 'Erreur lors de la recherche du bagage',
              type: 'error',
            };
        }
      }
      break;

    default:
      break;
  }

  return {
    title: 'Erreur',
    message: 'Une erreur est survenue',
    type: 'error',
  };
};

