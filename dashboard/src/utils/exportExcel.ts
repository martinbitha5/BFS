import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface ExportData {
  passengers?: any[];
  baggages?: any[];
  statistics?: any;
  birsItems?: any[];
}

/**
 * Export des données vers Excel avec logo et styles professionnels
 */
export const exportToExcel = async (
  data: ExportData,
  airportCode: string,
  startDate?: string,
  endDate?: string,
  flightNumber?: string,
  destination?: string
) => {
  const { passengers = [], baggages = [] } = data;

  // Filtrer les données par date si fourni
  const filterByDate = (item: any, start?: string, end?: string) => {
    if (!start || !end) return true;
    const itemDate = new Date(item.checked_at || item.checked_in_at || item.created_at || new Date());
    const startDateTime = new Date(start);
    const endDateTime = new Date(end);
    endDateTime.setHours(23, 59, 59, 999);
    return itemDate >= startDateTime && itemDate <= endDateTime;
  };

  const filteredPassengers = passengers.filter(p => filterByDate(p, startDate, endDate));
  const filteredBaggages = baggages.filter(b => filterByDate(b, startDate, endDate));

  // Vérifier qu'il y a des données après filtrage
  if (filteredPassengers.length === 0 && filteredBaggages.length === 0) {
    throw new Error('Aucune donnée à exporter pour cette période');
  }

  // Créer le workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Baggage Found Solution - Superviseur';
  workbook.created = new Date();

  // Texte de période
  let periodText = startDate && endDate
    ? `Du ${new Date(startDate).toLocaleDateString('fr-FR')} au ${new Date(endDate).toLocaleDateString('fr-FR')}`
    : 'Toutes les données';

  if (flightNumber && flightNumber !== 'all') {
    periodText += ` - Vol: ${flightNumber}`;
  }

  if (destination) {
    periodText += ` - Destination: ${destination}`;
  }

  // Calculer les statistiques filtrées
  const { birsItems = [] } = data;
  
  const stats = {
    totalPassengers: filteredPassengers.length,
    totalBaggages: filteredBaggages.length,
    boardedPassengers: filteredPassengers.filter((p: any) => p.boarding_status?.[0]?.boarded).length,
    notBoardedPassengers: filteredPassengers.filter((p: any) => !p.boarding_status?.[0]?.boarded).length,
    arrivedBaggages: filteredBaggages.filter((b: any) => b.status === 'arrived').length,
    inTransitBaggages: filteredBaggages.filter((b: any) => b.status === 'checked').length,
    // Statistiques BIRS
    totalBirsItems: birsItems.length,
    arrivedBirsItems: birsItems.filter((item: any) => item.reconciled_at).length,
    notArrivedBirsItems: birsItems.filter((item: any) => !item.reconciled_at).length,
  };

  const boardingRate = stats.totalPassengers > 0
    ? Math.round((stats.boardedPassengers / stats.totalPassengers) * 100)
    : 0;
  const arrivalRate = stats.totalBaggages > 0
    ? Math.round((stats.arrivedBaggages / stats.totalBaggages) * 100)
    : 0;
  const birsArrivalRate = stats.totalBirsItems > 0
    ? Math.round((stats.arrivedBirsItems / stats.totalBirsItems) * 100)
    : 0;

  // ===== FEUILLE 1: INFORMATIONS AVEC LOGO =====
  const infoSheet = workbook.addWorksheet('Informations', {
    properties: { tabColor: { argb: 'FF4472C4' } }
  });

  // Charger le logo
  try {
    console.log('[EXPORT STANDARD] Chargement du logo...');
    const response = await fetch('/assets/logo-ats-csi.png');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    const imageId = workbook.addImage({
      buffer: arrayBuffer,
      extension: 'png',
    });

    // Ajouter le logo dans la feuille (colonnes A-D, lignes 1-5)
    infoSheet.addImage(imageId, {
      tl: { col: 0, row: 0 },
      ext: { width: 250, height: 120 }
    });
    
    console.log('[EXPORT STANDARD] Logo ajouté');
  } catch (error) {
    console.error('[EXPORT STANDARD] Erreur logo:', error);
  }

  // Informations (commencer après le logo)
  infoSheet.getCell('A8').value = 'RAPPORT D\'ACTIVITÉ BFS - GESTION DES PASSAGERS ET BAGAGES';
  infoSheet.getCell('A8').font = { bold: true, size: 14, color: { argb: 'FF1F2937' } };

  infoSheet.getCell('A9').value = 'Baggage Found Solution - African Transport Systems';
  infoSheet.getCell('A9').font = { italic: true, size: 10, color: { argb: 'FF6B7280' } };

  infoSheet.getCell('A11').value = 'Aéroport';
  infoSheet.getCell('B11').value = airportCode;
  infoSheet.getCell('B11').font = { bold: true };

  infoSheet.getCell('A12').value = 'Date d\'export';
  infoSheet.getCell('B12').value = new Date().toLocaleString('fr-FR');

  infoSheet.getCell('A13').value = 'Période analysée';
  infoSheet.getCell('B13').value = periodText;

  infoSheet.getCell('A15').value = 'INDICATEURS DE PERFORMANCE';
  infoSheet.getCell('A15').font = { bold: true, size: 12, color: { argb: 'FF2563EB' } };

  const statsData = [
    ['Total Passagers', stats.totalPassengers],
    ['Passagers Embarqués', stats.boardedPassengers],
    ['Passagers Non Embarqués', stats.notBoardedPassengers],
    ['Taux d\'Embarquement', `${boardingRate}%`],
    ['', ''], // Ligne vide
    ['Total Bagages', stats.totalBaggages],
    ['Bagages Arrivés', stats.arrivedBaggages],
    ['Bagages En Transit', stats.inTransitBaggages],
    ['Taux d\'Arrivée des Bagages', `${arrivalRate}%`],
    ['', ''], // Ligne vide
    ['BRS - Total Bagages Internationaux', stats.totalBirsItems],
    ['BRS - Bagages Arrivés', stats.arrivedBirsItems],
    ['BRS - Bagages Non Arrivés', stats.notArrivedBirsItems],
    ['BRS - Taux d\'Arrivée', `${birsArrivalRate}%`],
  ];

  statsData.forEach((row, index) => {
    const rowNum = 16 + index;
    infoSheet.getCell(`A${rowNum}`).value = row[0];
    infoSheet.getCell(`A${rowNum}`).font = { bold: true };
    infoSheet.getCell(`B${rowNum}`).value = row[1];
  });

  // Largeurs de colonnes
  infoSheet.getColumn('A').width = 35;
  infoSheet.getColumn('B').width = 30;

  // ===== FEUILLE 2: PASSAGERS =====
  if (filteredPassengers.length > 0) {
    const passSheet = workbook.addWorksheet('Passagers', {
      properties: { tabColor: { argb: 'FF22C55E' } }
    });

    const passHeaders = [
      'PNR',
      'Nom Complet',
      'Vol',
      'Départ',
      'Arrivée',
      'Siège',
      'Statut',
      'Bagages'
    ];
    passSheet.addRow(passHeaders);

    const passHeaderRow = passSheet.getRow(1);
    passHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    passHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' }
    };
    passHeaderRow.height = 25;
    passHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };

    filteredPassengers.forEach((p: any) => {
      const boarded = p.boarding_status?.[0]?.boarded || false;
      passSheet.addRow([
        p.pnr,
        p.full_name,
        p.flight_number,
        p.departure,
        p.arrival,
        p.seat_number || '-',
        boarded ? 'Embarqué' : 'Non embarqué',
        p.baggage_count || 0
      ]);
    });

    // Largeurs de colonnes
    passSheet.getColumn(1).width = 15;  // PNR
    passSheet.getColumn(2).width = 25;  // Nom
    passSheet.getColumn(3).width = 12;  // Vol
    passSheet.getColumn(4).width = 10;  // Départ
    passSheet.getColumn(5).width = 10;  // Arrivée
    passSheet.getColumn(6).width = 8;   // Siège
    passSheet.getColumn(7).width = 15;  // Statut
    passSheet.getColumn(8).width = 10;  // Bagages

    // Bordures et alignement
    passSheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
      }
    });
  }

  // ===== FEUILLE 3: BAGAGES =====
  // Toujours créer la feuille Bagages (même si vide)
  const bagSheet = workbook.addWorksheet('Bagages', {
    properties: { tabColor: { argb: 'FFF59E0B' } }
  });

  const bagHeaders = [
    'Tag',
    'PNR',
    'Nom Complet',
    'Vol',
    'Poids (kg)',
    'Statut',
    'Arrivé le',
    'Localisation'
  ];
  bagSheet.addRow(bagHeaders);

  const bagHeaderRow = bagSheet.getRow(1);
  bagHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  bagHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' }
  };
  bagHeaderRow.height = 25;
  bagHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };

  if (filteredBaggages.length > 0) {
    filteredBaggages.forEach((b: any) => {
      const statusLabel = b.status === 'arrived' ? 'Arrivé'
        : b.status === 'rush' ? 'RUSH'
        : b.status === 'loaded' ? 'Loaded'
        : b.passenger_id ? 'Loaded'  // Si bagage lié au passager → Loaded
          : 'Enregistré';

      // Chercher le passager correspondant - essayer plusieurs approches
      let passengerName = '-';
      let passengerPnr = '-';
      
      // Si le bagage a un champ passengers (objet imbriqué de l'API)
      if (b.passengers?.full_name) {
        passengerName = b.passengers.full_name;
        passengerPnr = b.passengers.pnr || '-';
      }
      // Si le bagage a un champ passenger_name directement, l'utiliser
      else if (b.passenger_name && b.passenger_name !== b.passenger_id) {
        passengerName = b.passenger_name;
      }
      
      // Sinon chercher dans la liste des passagers
      if (passengerName === '-' && b.passenger_id) {
        const passenger = filteredPassengers.find((p: any) => 
          p.pnr === b.passenger_id || 
          p.id === b.passenger_id ||
          p.full_name?.toLowerCase() === (b.passenger_id || '').toLowerCase()
        );
        if (passenger) {
          passengerName = passenger.full_name || '-';
          passengerPnr = passenger.pnr || '-';
        } else {
          passengerName = b.passenger_id || '-';
        }
      }

      bagSheet.addRow([
        b.tag_number,
        passengerPnr,
        passengerName,
        b.flight_number,
        b.weight || 0,
        statusLabel,
        b.arrived_at ? new Date(b.arrived_at).toLocaleString('fr-FR') : '-',
        b.current_location || '-'
      ]);
    });
  } else {
    // Si pas de bagages, ajouter un message
    bagSheet.addRow(['Aucun bagage pour cette période', '', '', '', '', '', '', '']);
    bagSheet.getCell('A2').font = { italic: true, color: { argb: 'FF6B7280' } };
  }

  // Largeurs de colonnes
  bagSheet.getColumn(1).width = 15;  // Tag
  bagSheet.getColumn(2).width = 12;  // PNR
  bagSheet.getColumn(3).width = 25;  // Nom Complet
  bagSheet.getColumn(4).width = 12;  // Vol
  bagSheet.getColumn(5).width = 10;  // Poids
  bagSheet.getColumn(6).width = 12;  // Statut
  bagSheet.getColumn(7).width = 20;  // Arrivé le
  bagSheet.getColumn(8).width = 15;  // Localisation

  // Bordures et alignement
  bagSheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
    }
  });

  // ===== FEUILLE 4: BRS INTERNATIONAL =====
  // Cette section est gérée plus bas dans le code

  // =============================================
  // FEUILLE 4 : BRS INTERNATIONAL (BAGAGES ATTENDUS)
  // =============================================
  // birsItems est déjà extrait au début de la fonction
  
  if (birsItems.length > 0) {
    const birsSheet = workbook.addWorksheet('BRS International', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
    });

    // En-têtes
    birsSheet.addRow([
      'N° Bagage',
      'Passager',
      'PNR',
      'Vol',
      'Date',
      'Compagnie',
      'Classe',
      'Poids (KG)',
      'Route',
      'Catégories',
      'Statut',
      'Tag RFID Scanné'
    ]);

    // Style des en-têtes
    birsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    birsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0066CC' }
    };
    birsSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    birsSheet.getRow(1).height = 25;

    // Données
    birsItems.forEach((item: any) => {
      // Déterminer le statut (réconcilié = a une date de réconciliation)
      let statut = 'NON ARRIVÉ';
      let tagNumber = '-';
      
      if (item.reconciled_at) {
        statut = 'ARRIVÉ';
        // Le RFID tag est stocké dans international_baggage, pas directement dans l'item
        tagNumber = item.tag_number || item.bag_id || '-';
      }

      birsSheet.addRow([
        item.bag_id || '-',
        item.passenger_name || '-',
        item.pnr || '-',
        item.flight_number || '-',
        item.flight_date ? new Date(item.flight_date).toLocaleDateString('fr-FR') : '-',
        item.airline || '-',
        item.class || '-',
        item.weight || 0,
        item.route || '-',
        item.categories || '-',
        statut,
        tagNumber
      ]);
    });

    // Largeurs de colonnes
    birsSheet.getColumn(1).width = 15;  // N° Bagage
    birsSheet.getColumn(2).width = 25;  // Passager
    birsSheet.getColumn(3).width = 12;  // PNR
    birsSheet.getColumn(4).width = 12;  // Vol
    birsSheet.getColumn(5).width = 12;  // Date
    birsSheet.getColumn(6).width = 20;  // Compagnie
    birsSheet.getColumn(7).width = 10;  // Classe
    birsSheet.getColumn(8).width = 12;  // Poids
    birsSheet.getColumn(9).width = 15;  // Route
    birsSheet.getColumn(10).width = 15; // Catégories
    birsSheet.getColumn(11).width = 18; // Statut
    birsSheet.getColumn(12).width = 20; // RFID

    // Bordures et alignement
    birsSheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          
          // Couleur selon le statut (colonne 11)
          if (colNumber === 11) {
            if (cell.value === 'ARRIVÉ') {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF90EE90' } // Vert clair
              };
            } else if (cell.value === 'NON ARRIVÉ') {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFCCCC' } // Rouge clair
              };
            }
          }
        });
      }
    });

    console.log(`Feuille BIRS ajoutée avec ${birsItems.length} bagages`);
  }

  // Générer et sauvegarder le fichier
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const dateStr = new Date().toISOString().split('T')[0];
  const dateRange = startDate && endDate ? `_${startDate}_${endDate}` : '';
  const flightSuffix = flightNumber && flightNumber !== 'all' ? `_${flightNumber}` : '';
  const destSuffix = destination ? `_${destination}` : '';
  const fileName = `BFS_Export_${airportCode}_${dateStr}${dateRange}${flightSuffix}${destSuffix}.xlsx`;

  saveAs(blob, fileName);
};

/**
 * Export des raw scans avec parsing vers Excel
 */
export const exportRawScansToExcel = async (
  data: any,
  airportCode: string,
  startDate?: string,
  endDate?: string,
  flight?: string,
  destination?: string
) => {
  const { rawScans = [], rawScansStats } = data;

  if (rawScans.length === 0) {
    throw new Error('Aucune donnée à exporter');
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Baggage Found Solution - Superviseur';
  workbook.created = new Date();

  let periodText = startDate && endDate
    ? `Du ${new Date(startDate).toLocaleDateString('fr-FR')} au ${new Date(endDate).toLocaleDateString('fr-FR')}`
    : 'Toutes les données';
  
  // Ajouter les filtres dans le texte
  const filters = [];
  if (flight) filters.push(`Vol: ${flight}`);
  if (destination) filters.push(`Destination: ${destination}`);
  if (filters.length > 0) {
    periodText += ` (${filters.join(', ')})`;
  }

  // Feuille 1: Info
  const infoSheet = workbook.addWorksheet('Informations', {
    properties: { tabColor: { argb: 'FF4472C4' } }
  });

  // Charger le logo
  try {
    console.log('[EXPORT RAW SCANS] Chargement du logo...');
    const response = await fetch('/assets/logo-ats-csi.png');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    const imageId = workbook.addImage({
      buffer: arrayBuffer,
      extension: 'png',
    });

    // Ajouter le logo dans la feuille (colonnes A-D, lignes 1-5)
    infoSheet.addImage(imageId, {
      tl: { col: 0, row: 0 },
      ext: { width: 250, height: 120 }
    });
    
    console.log('[EXPORT RAW SCANS] Logo ajouté');
  } catch (error) {
    console.error('[EXPORT RAW SCANS] Erreur logo:', error);
  }

  infoSheet.getCell('A8').value = 'EXPORT RAW SCANS - DONNÉES BRUTES PURES (SANS PARSING)';
  infoSheet.getCell('A8').font = { bold: true, size: 14 };
  infoSheet.getCell('A11').value = 'Aéroport';
  infoSheet.getCell('B11').value = airportCode;
  infoSheet.getCell('B11').font = { bold: true };
  infoSheet.getCell('A12').value = 'Date d\'export';
  infoSheet.getCell('B12').value = new Date().toLocaleString('fr-FR');
  infoSheet.getCell('A13').value = 'Période analysée';
  infoSheet.getCell('B13').value = periodText;
  infoSheet.getCell('A15').value = 'STATISTIQUES';
  infoSheet.getCell('A15').font = { bold: true, size: 12 };
  infoSheet.getCell('A16').value = 'Total Scans';
  infoSheet.getCell('B16').value = rawScansStats.total;
  infoSheet.getCell('A17').value = 'Boarding Pass';
  infoSheet.getCell('B17').value = rawScansStats.by_type.boarding_pass;
  infoSheet.getCell('A18').value = 'Baggage Tag';
  infoSheet.getCell('B18').value = rawScansStats.by_type.baggage_tag;
  infoSheet.getCell('A19').value = 'Check-in';
  infoSheet.getCell('B19').value = rawScansStats.by_status.checkin;
  infoSheet.getCell('A20').value = 'Bagage';
  infoSheet.getCell('B20').value = rawScansStats.by_status.baggage;
  infoSheet.getCell('A21').value = 'Embarquement';
  infoSheet.getCell('B21').value = rawScansStats.by_status.boarding;
  infoSheet.getCell('A22').value = 'Arrivée';
  infoSheet.getCell('B22').value = rawScansStats.by_status.arrival;
  infoSheet.getColumn('A').width = 35;
  infoSheet.getColumn('B').width = 30;

  // Feuille 2: Raw Scans - Données brutes pures
  const scansSheet = workbook.addWorksheet('Raw Scans');
  scansSheet.addRow(['ID', 'Type', 'Données Brutes (Raw Data)', 'Check-in', 'Bagage', 'Embarquement', 'Arrivée', 'Tag RFID', 'Scan Count', 'Premier Scan', 'Dernier Scan']);
  rawScans.forEach((scan: any) => {
    scansSheet.addRow([
      scan.id,
      scan.scan_type === 'boarding_pass' ? 'BP' : 'BT',
      scan.raw_data, // Données brutes exactes
      scan.status_checkin ? 'OUI' : 'NON',
      scan.status_baggage ? 'OUI' : 'NON',
      scan.status_boarding ? 'OUI' : 'NON',
      scan.status_arrival ? 'OUI' : 'NON',
      scan.baggage_rfid_tag || '-',
      scan.scan_count,
      new Date(scan.first_scanned_at).toLocaleString('fr-FR'),
      new Date(scan.last_scanned_at).toLocaleString('fr-FR'),
    ]);
  });
  
  // Ajuster les largeurs de colonnes
  scansSheet.getColumn(1).width = 25; // ID
  scansSheet.getColumn(2).width = 8;  // Type
  scansSheet.getColumn(3).width = 80; // Raw Data (large)
  scansSheet.getColumn(4).width = 10; // Check-in
  scansSheet.getColumn(5).width = 10; // Bagage
  scansSheet.getColumn(6).width = 13; // Embarquement
  scansSheet.getColumn(7).width = 10; // Arrivée
  scansSheet.getColumn(8).width = 15; // Tag RFID
  scansSheet.getColumn(9).width = 10; // Scan Count
  scansSheet.getColumn(10).width = 18; // Premier Scan
  scansSheet.getColumn(11).width = 18; // Dernier Scan
  
  // Style pour l'en-tête
  const headerRow = scansSheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  
  // Wrap text pour la colonne Raw Data
  scansSheet.getColumn(3).alignment = { wrapText: true, vertical: 'top' };

  // Générer et sauvegarder
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `BFS_RawScans_${airportCode}_${dateStr}.xlsx`;
  saveAs(blob, fileName);
};
