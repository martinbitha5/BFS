import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface ExportData {
  passengers?: any[];
  baggages?: any[];
  statistics?: any;
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

  // Vérifier qu'il y a des données
  if (passengers.length === 0 && baggages.length === 0) {
    throw new Error('Aucune donnée à exporter');
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
  const stats = {
    totalPassengers: passengers.length,
    totalBaggages: baggages.length,
    boardedPassengers: passengers.filter((p: any) => p.boarding_status?.[0]?.boarded).length,
    notBoardedPassengers: passengers.filter((p: any) => !p.boarding_status?.[0]?.boarded).length,
    arrivedBaggages: baggages.filter((b: any) => b.status === 'arrived').length,
    inTransitBaggages: baggages.filter((b: any) => b.status === 'checked').length,
  };

  const boardingRate = stats.totalPassengers > 0 
    ? Math.round((stats.boardedPassengers / stats.totalPassengers) * 100)
    : 0;
  const arrivalRate = stats.totalBaggages > 0
    ? Math.round((stats.arrivedBaggages / stats.totalBaggages) * 100)
    : 0;

  // ===== FEUILLE 1: INFORMATIONS AVEC LOGO =====
  const infoSheet = workbook.addWorksheet('Informations', {
    properties: { tabColor: { argb: 'FF4472C4' } }
  });

  // Charger le logo
  try {
    const response = await fetch('/assets/logo-ats-csi.png');
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
  } catch (error) {
    console.warn('Impossible de charger le logo:', error);
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
    ['Total Bagages', stats.totalBaggages],
    ['Bagages Arrivés', stats.arrivedBaggages],
    ['Bagages En Transit', stats.inTransitBaggages],
    ['Taux d\'Arrivée des Bagages', `${arrivalRate}%`],
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
  if (passengers.length > 0) {
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
      'Enregistrement',
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

    passengers.forEach((p: any) => {
      const boarded = p.boarding_status?.[0]?.boarded || false;
      passSheet.addRow([
        p.pnr,
        p.full_name,
        p.flight_number,
        p.departure,
        p.arrival,
        p.seat_number || '-',
        new Date(p.checked_in_at).toLocaleString('fr-FR'),
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
    passSheet.getColumn(7).width = 20;  // Enregistrement
    passSheet.getColumn(8).width = 15;  // Statut
    passSheet.getColumn(9).width = 10;  // Bagages
    
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
  if (baggages.length > 0) {
    const bagSheet = workbook.addWorksheet('Bagages', {
      properties: { tabColor: { argb: 'FFF59E0B' } }
    });

    const bagHeaders = [
      'Tag',
      'Passager ID',
      'Vol',
      'Poids (kg)',
      'Statut',
      'Enregistré le',
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

    baggages.forEach((b: any) => {
      const statusLabel = b.status === 'arrived' ? 'Arrivé' 
        : b.status === 'rush' ? 'RUSH' 
        : 'En transit';
      
      bagSheet.addRow([
        b.tag_number,
        b.passenger_id,
        b.flight_number,
        b.weight,
        statusLabel,
        new Date(b.checked_at).toLocaleString('fr-FR'),
        b.arrived_at ? new Date(b.arrived_at).toLocaleString('fr-FR') : '-',
        b.current_location || '-'
      ]);
    });

    // Largeurs de colonnes
    bagSheet.getColumn(1).width = 15;  // Tag
    bagSheet.getColumn(2).width = 15;  // Passager ID
    bagSheet.getColumn(3).width = 12;  // Vol
    bagSheet.getColumn(4).width = 10;  // Poids
    bagSheet.getColumn(5).width = 12;  // Statut
    bagSheet.getColumn(6).width = 20;  // Enregistré le
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
  }

  // ===== FEUILLE 4: EMBARQUEMENTS =====
  if (passengers.length > 0) {
    const boardSheet = workbook.addWorksheet('Embarquements', {
      properties: { tabColor: { argb: 'FF8B5CF6' } }
    });

    const boardHeaders = [
      'PNR',
      'Nom Complet',
      'Vol',
      'Départ → Arrivée',
      'Statut',
      'Check-in',
      'Embarquement'
    ];
    boardSheet.addRow(boardHeaders);
    
    const boardHeaderRow = boardSheet.getRow(1);
    boardHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    boardHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' }
    };
    boardHeaderRow.height = 25;
    boardHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };

    passengers.forEach((p: any) => {
      const boarded = p.boarding_status?.[0]?.boarded || false;
      const boardedAt = p.boarding_status?.[0]?.boarded_at;
      
      boardSheet.addRow([
        p.pnr,
        p.full_name,
        p.flight_number,
        `${p.departure} → ${p.arrival}`,
        boarded ? 'Embarqué' : 'Non embarqué',
        new Date(p.checked_in_at).toLocaleString('fr-FR'),
        boardedAt ? new Date(boardedAt).toLocaleString('fr-FR') : '-'
      ]);
    });

    // Largeurs de colonnes
    boardSheet.getColumn(1).width = 15;  // PNR
    boardSheet.getColumn(2).width = 25;  // Nom
    boardSheet.getColumn(3).width = 12;  // Vol
    boardSheet.getColumn(4).width = 20;  // Route
    boardSheet.getColumn(5).width = 15;  // Statut
    boardSheet.getColumn(6).width = 20;  // Check-in
    boardSheet.getColumn(7).width = 20;  // Embarquement
    
    // Bordures et alignement
    boardSheet.eachRow((row, rowNumber) => {
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
