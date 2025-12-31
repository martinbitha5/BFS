import * as FileSystem from 'expo-file-system';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { Baggage } from '../types/baggage.types';
import { BoardingStatus } from '../types/boarding.types';
import { Passenger } from '../types/passenger.types';
import { databaseServiceInstance } from './database.service';

interface ExportOptions {
  dateFrom?: string;
  dateTo?: string;
  flightNumber?: string;
  pnr?: string;
  name?: string;
}

class ExportService {
  async exportToCSV(
    passengers: Passenger[],
    includeBaggages: boolean = true
  ): Promise<string> {
    // Créer le CSV pour les passagers
    const headers = [
      'PNR',
      'Nom complet',
      'Prénom',
      'Nom',
      'Numéro de vol',
      'Route',
      'Départ',
      'Arrivée',
      'Heure du vol',
      'Siège',
      'Nombre de bagages',
      'Date d\'enregistrement',
      'Heure d\'enregistrement',
      'Synchronisé',
    ];

    const rows = passengers.map((passenger) => {
      const checkedInDate = new Date(passenger.checkedInAt);
      return [
        passenger.pnr,
        passenger.fullName,
        passenger.firstName,
        passenger.lastName,
        passenger.flightNumber,
        passenger.route,
        passenger.departure,
        passenger.arrival,
        passenger.flightTime || '-',
        passenger.seatNumber || '-',
        passenger.baggageCount.toString(),
        checkedInDate.toLocaleDateString('fr-FR'),
        checkedInDate.toLocaleTimeString('fr-FR'),
        passenger.synced ? 'Oui' : 'Non',
      ];
    });

    let csvContent = headers.join(',') + '\n';
    rows.forEach((row) => {
      csvContent += row.map((cell) => `"${cell}"`).join(',') + '\n';
    });

    // Ajouter les bagages si demandé
    if (includeBaggages) {
      csvContent += '\n\n=== BAGAGES ===\n';
      const baggageHeaders = [
        'Tag RFID',
        'PNR Passager',
        'Nom Passager',
        'Statut',
        'Scanné le',
        'Arrivé le',
        'Synchronisé',
      ];
      csvContent += baggageHeaders.join(',') + '\n';

      for (const passenger of passengers) {
        const baggages = await databaseServiceInstance.getBaggagesByPassengerId(passenger.id);
        for (const baggage of baggages) {
          const checkedDate = baggage.checkedAt ? new Date(baggage.checkedAt) : null;
          const arrivedDate = baggage.arrivedAt ? new Date(baggage.arrivedAt) : null;
          const row = [
            baggage.tagNumber,
            passenger.pnr,
            passenger.fullName,
            baggage.status === 'arrived' ? 'Arrivé' : baggage.status === 'rush' ? 'Rush (Soute pleine)' : 'En transit',
            checkedDate ? checkedDate.toLocaleDateString('fr-FR') : '-',
            arrivedDate ? arrivedDate.toLocaleDateString('fr-FR') : '-',
            baggage.synced ? 'Oui' : 'Non',
          ];
          csvContent += row.map((cell) => `"${cell}"`).join(',') + '\n';
        }
      }
    }

    // Sauvegarder le fichier CSV
    const fileName = `export_bfs_${new Date().toISOString().split('T')[0]}.csv`;
    const fileUri = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return fileUri;
  }

  async shareFile(fileUri: string): Promise<void> {
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri);
    } else {
      throw new Error('Le partage de fichiers n\'est pas disponible sur cet appareil');
    }
  }

  /**
   * Exporte en format Excel (XLSX) avec toutes les opérations de l'aéroport
   * @param airportCode Code de l'aéroport
   * @param passengers Liste de tous les passagers de l'aéroport
   * @param baggages Liste de tous les bagages de l'aéroport
   * @param boardingStatuses Liste de tous les statuts d'embarquement
   */
  async exportToExcel(
    airportCode: string,
    passengers: Passenger[],
    baggages: Baggage[],
    boardingStatuses: BoardingStatus[]
  ): Promise<string> {
    // Créer un nouveau workbook
    const workbook = XLSX.utils.book_new();

    // Créer un Map pour accéder rapidement aux passagers par ID
    const passengersMap = new Map(passengers.map(p => [p.id, p]));

    // Feuille 1: Passagers
    const passengerData = passengers.map((passenger) => {
      const checkedInDate = new Date(passenger.checkedInAt);
      return {
        'PNR': passenger.pnr,
        'Nom complet': passenger.fullName,
        'Prénom': passenger.firstName,
        'Nom': passenger.lastName,
        'Numéro de vol': passenger.flightNumber,
        'Route': passenger.route,
        'Départ': passenger.departure,
        'Arrivée': passenger.arrival,
        'Heure du vol': passenger.flightTime || '-',
        'Siège': passenger.seatNumber || '-',
        'Nombre de bagages': passenger.baggageCount,
        'Date d\'enregistrement': checkedInDate.toLocaleDateString('fr-FR'),
        'Heure d\'enregistrement': checkedInDate.toLocaleTimeString('fr-FR'),
        'Synchronisé': passenger.synced ? 'Oui' : 'Non',
      };
    });

    const passengerSheet = XLSX.utils.json_to_sheet(passengerData);
    XLSX.utils.book_append_sheet(workbook, passengerSheet, 'Passagers');

    // Feuille 2: Bagages
    const baggageData = baggages.map((baggage) => {
      const passenger = passengersMap.get(baggage.passengerId);
      const checkedDate = baggage.checkedAt ? new Date(baggage.checkedAt) : null;
      const arrivedDate = baggage.arrivedAt ? new Date(baggage.arrivedAt) : null;
      return {
        'Tag RFID': baggage.tagNumber,
        'PNR Passager': passenger?.pnr || '-',
        'Nom Passager': passenger?.fullName || '-',
        'Statut': baggage.status === 'arrived' ? 'Arrivé' : baggage.status === 'rush' ? 'Rush (Soute pleine)' : 'En transit',
        'Scanné le': checkedDate ? checkedDate.toLocaleDateString('fr-FR') + ' ' + checkedDate.toLocaleTimeString('fr-FR') : '-',
        'Arrivé le': arrivedDate ? arrivedDate.toLocaleDateString('fr-FR') + ' ' + arrivedDate.toLocaleTimeString('fr-FR') : '-',
        'Synchronisé': baggage.synced ? 'Oui' : 'Non',
      };
    });

    if (baggageData.length > 0) {
      const baggageSheet = XLSX.utils.json_to_sheet(baggageData);
      XLSX.utils.book_append_sheet(workbook, baggageSheet, 'Bagages');
    }

    // Feuille 3: Embarquements
    const boardingData = boardingStatuses.map((boarding) => {
      const passenger = passengersMap.get(boarding.passengerId);
      const boardedDate = boarding.boardedAt ? new Date(boarding.boardedAt) : null;
      return {
        'PNR': passenger?.pnr || '-',
        'Nom Passager': passenger?.fullName || '-',
        'Numéro de vol': passenger?.flightNumber || '-',
        'Embarqué': boarding.boarded ? 'Oui' : 'Non',
        'Date d\'embarquement': boardedDate ? boardedDate.toLocaleDateString('fr-FR') + ' ' + boardedDate.toLocaleTimeString('fr-FR') : '-',
        'Synchronisé': boarding.synced ? 'Oui' : 'Non',
      };
    });

    if (boardingData.length > 0) {
      const boardingSheet = XLSX.utils.json_to_sheet(boardingData);
      XLSX.utils.book_append_sheet(workbook, boardingSheet, 'Embarquements');
    }

    // Convertir en buffer
    const excelBuffer = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

    // Sauvegarder le fichier
    const fileName = `export_bfs_${airportCode}_${new Date().toISOString().split('T')[0]}.xlsx`;
    const fileUri = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(fileUri, excelBuffer, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return fileUri;
  }

  /**
   * Exporte et envoie par email (format Excel)
   */
  async exportAndEmail(
    airportCode: string,
    passengers: Passenger[],
    baggages: Baggage[],
    boardingStatuses: BoardingStatus[],
    userEmail: string
  ): Promise<void> {
    // Créer le fichier Excel
    const fileUri = await this.exportToExcel(airportCode, passengers, baggages, boardingStatuses);
    
    // Utiliser expo-sharing qui peut ouvrir le client email
    // Le système ouvrira le menu de partage qui inclut l'email
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: `Envoyer l'export Excel par email`,
        UTI: 'org.openxmlformats.spreadsheetml.sheet',
      });
    } else {
      // Fallback : créer un lien mailto
      const subject = encodeURIComponent(`Export BFS Excel - ${airportCode} - ${new Date().toLocaleDateString('fr-FR')}`);
      const body = encodeURIComponent(
        `Bonjour,\n\nVeuillez trouver ci-joint l'export Excel de toutes les opérations de l'aéroport ${airportCode}.\n\n` +
        `Nombre de passagers: ${passengers.length}\n` +
        `Nombre de bagages: ${baggages.length}\n` +
        `Nombre d'embarquements: ${boardingStatuses.length}\n\n` +
        `Cordialement`
      );
      const mailtoUrl = `mailto:${userEmail}?subject=${subject}&body=${body}`;
      
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        throw new Error('Impossible d\'ouvrir le client email');
      }
    }
  }

  /**
   * Exporte uniquement le fichier Excel (sans email)
   */
  async exportExcelFile(
    airportCode: string,
    passengers: Passenger[],
    baggages: Baggage[],
    boardingStatuses: BoardingStatus[]
  ): Promise<string> {
    // Créer le fichier Excel
    const fileUri = await this.exportToExcel(airportCode, passengers, baggages, boardingStatuses);
    
    // Partager le fichier (ouvre le menu de partage)
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: `Partager l'export Excel`,
        UTI: 'org.openxmlformats.spreadsheetml.sheet',
      });
    }
    
    return fileUri;
  }

  /**
   * Exporte les bagages en format Excel avec onglets séparés pour ARRIVÉS et DÉPART
   * Format spécialisé pour les listes de bagages comme dans l'image
   * @param airportCode Code de l'aéroport
   * @param route Route optionnelle pour filtrer (ex: "FIH-FKI")
   */
  async exportBaggagesListToExcel(
    airportCode: string,
    route?: string
  ): Promise<string> {
    // Récupérer tous les bagages et passagers de l'aéroport
    const allBaggages = await databaseServiceInstance.getBaggagesByAirport(airportCode);
    const allPassengers = await databaseServiceInstance.getPassengersByAirport(airportCode);
    const passengersMap = new Map(allPassengers.map(p => [p.id, p]));

    // Filtrer par route si spécifiée
    let filteredBaggages = allBaggages;
    if (route) {
      const [departure, arrival] = route.split('-');
      filteredBaggages = allBaggages.filter(baggage => {
        const passenger = passengersMap.get(baggage.passengerId);
        if (!passenger) return false;
        return passenger.departure === departure && passenger.arrival === arrival;
      });
    }

    // Séparer les bagages en ARRIVÉS et DÉPART
    // Basé sur la route du passager : 
    // - ARRIVÉS : bagages dont le passager a cet aéroport comme destination
    // - DÉPART : bagages dont le passager a cet aéroport comme départ
    const arrivedBaggages: Array<Baggage & { passenger: Passenger }> = [];
    const departureBaggages: Array<Baggage & { passenger: Passenger }> = [];

    filteredBaggages.forEach(baggage => {
      const passenger = passengersMap.get(baggage.passengerId);
      if (!passenger) return;

      // Bagages ARRIVÉS : l'aéroport est la destination du passager
      if (passenger.arrival === airportCode) {
        arrivedBaggages.push({ ...baggage, passenger });
      }
      
      // Bagages DÉPART : l'aéroport est le départ du passager
      if (passenger.departure === airportCode) {
        departureBaggages.push({ ...baggage, passenger });
      }
    });

    // Créer un nouveau workbook
    const workbook = XLSX.utils.book_new();

    // Fonction helper pour créer le code de vol formaté
    const formatFlightCode = (passenger: Passenger): string => {
      if (!passenger.flightNumber || !passenger.departure || !passenger.arrival) return '';
      
      // Extraire le numéro de vol (ex: "ET 0078" -> "0078", "ET0078" -> "0078", "0078" -> "0078")
      const flightNumMatch = passenger.flightNumber.match(/(\d{3,4})/);
      const flightNum = flightNumMatch ? flightNumMatch[1] : '';
      
      // Créer le code comme "FIHKNLET 0078" ou "FIHFKIET 0078"
      // Format: DÉPART + ARRIVÉE + ET + numéro
      const routeCode = `${passenger.departure}${passenger.arrival}ET`;
      return flightNum ? `${routeCode} ${flightNum}` : routeCode;
    };

    // Fonction helper pour extraire le numéro de base du tag RFID
    const extractBaseTag = (tagNumber: string): string => {
      // Si le tag contient des chiffres, prendre les 10 premiers chiffres
      const numbers = tagNumber.match(/\d+/g);
      if (numbers && numbers.length > 0) {
        const fullNumber = numbers.join('');
        // Prendre les 10 premiers chiffres comme numéro de base
        return fullNumber.substring(0, 10);
      }
      return tagNumber;
    };

    // Fonction helper pour créer une feuille Excel de bagages
    const createBaggageSheet = (baggages: Array<Baggage & { passenger: Passenger }>, sheetName: string) => {
      if (baggages.length === 0) return null;

      // En-têtes de colonnes
      const headers = ['Tag Base', 'Nom Passager', 'Code Vol', 'PNR', 'Siège', 'Tag RFID', 'Ticket'];
      
      // Créer les lignes de données
      const dataRows = baggages.map((baggage) => {
        const baseTag = extractBaseTag(baggage.tagNumber);
        const flightCode = formatFlightCode(baggage.passenger);
        return [
          baseTag,
          baggage.passenger.fullName,
          flightCode,
          baggage.passenger.pnr || '',
          baggage.passenger.seatNumber || '',
          baggage.tagNumber,
          baggage.passenger.ticketNumber || ''
        ];
      });

      // Créer la feuille avec en-têtes et données
      const sheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
      
      return { sheet, name: sheetName.substring(0, 31) }; // Excel limite à 31 caractères
    };

    // Feuille 1: BAGS ARRIVÉS
    const arrivedSheetName = route 
      ? `BAGS ARRIVÉS ${route.split('-').reverse().join('-')}` // Inverser pour "FKI-FIH"
      : `BAGS ARRIVÉS ${airportCode}`;
    const arrivedSheetResult = createBaggageSheet(arrivedBaggages, arrivedSheetName);
    if (arrivedSheetResult) {
      XLSX.utils.book_append_sheet(workbook, arrivedSheetResult.sheet, arrivedSheetResult.name);
    }

    // Feuille 2: BAGS DÉPART
    const departureSheetName = route 
      ? `BAGS DÉPART ${route}`
      : `BAGS DÉPART ${airportCode}`;
    const departureSheetResult = createBaggageSheet(departureBaggages, departureSheetName);
    if (departureSheetResult) {
      XLSX.utils.book_append_sheet(workbook, departureSheetResult.sheet, departureSheetResult.name);
    }

    // Convertir en buffer
    const excelBuffer = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

    // Sauvegarder le fichier
    const routeSuffix = route ? `_${route.replace('-', '')}` : '';
    const fileName = `liste_bagages_${airportCode}${routeSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`;
    const fileUri = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(fileUri, excelBuffer, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return fileUri;
  }

}

export const exportService = new ExportService();

