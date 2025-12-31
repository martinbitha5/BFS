/**
 * Utilitaires pour l'import/export de données CSV
 * Permet d'importer et exporter des passagers, bagages, et données d'embarquement
 */

import axios from 'axios';

export interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  skipped: number;
}

export interface ExportOptions {
  format: 'csv' | 'json';
  includeHeaders: boolean;
  delimiter?: string;
}

/**
 * Parse un fichier CSV
 */
export function parseCSV(content: string, delimiter: string = ','): Record<string, string>[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
  const data: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    data.push(row);
  }
  
  return data;
}

/**
 * Convertir des données en CSV
 */
export function toCSV(data: any[], options: ExportOptions = { format: 'csv', includeHeaders: true }): string {
  if (data.length === 0) return '';
  
  const delimiter = options.delimiter || ',';
  const headers = Object.keys(data[0]);
  
  let csv = '';
  if (options.includeHeaders) {
    csv += headers.map(h => `"${h}"`).join(delimiter) + '\n';
  }
  
  data.forEach(row => {
    csv += headers.map(h => `"${row[h] || ''}"`).join(delimiter) + '\n';
  });
  
  return csv;
}

/**
 * Télécharger un fichier
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporter les passagers
 */
export async function exportPassengers(
  apiUrl: string,
  token: string,
  airportCode?: string,
  options: ExportOptions = { format: 'csv', includeHeaders: true }
): Promise<void> {
  try {
    const params: any = {};
    if (airportCode) params.airportCode = airportCode;
    
    const response = await axios.get(`${apiUrl}/api/v1/passengers`, {
      headers: { Authorization: `Bearer ${token}` },
      params
    });
    
    const passengers = response.data;
    
    if (options.format === 'csv') {
      const csvData = passengers.map((p: any) => ({
        'PNR': p.pnr,
        'Nom Complet': p.fullName,
        'Prénom': p.firstName,
        'Nom': p.lastName,
        'Vol': p.flightNumber,
        'Compagnie': p.airline,
        'Départ': p.departure,
        'Heure': p.flightTime,
        'Siège': p.seatNumber,
        'Bagages': p.baggageCount,
        'Date Check-in': p.checkedInAt,
        'Agent': p.checkedInBy
      }));
      
      const csv = toCSV(csvData, options);
      const filename = `passagers_${airportCode || 'all'}_${Date.now()}.csv`;
      downloadFile(csv, filename);
    } else {
      const json = JSON.stringify(passengers, null, 2);
      const filename = `passagers_${airportCode || 'all'}_${Date.now()}.json`;
      downloadFile(json, filename, 'application/json');
    }
  } catch (error) {
    console.error('Erreur lors de l\'export des passagers:', error);
    throw error;
  }
}

/**
 * Exporter les bagages
 */
export async function exportBaggages(
  apiUrl: string,
  token: string,
  airportCode?: string,
  options: ExportOptions = { format: 'csv', includeHeaders: true }
): Promise<void> {
  try {
    const params: any = {};
    if (airportCode) params.airportCode = airportCode;
    
    const response = await axios.get(`${apiUrl}/api/v1/baggage`, {
      headers: { Authorization: `Bearer ${token}` },
      params
    });
    
    const baggages = response.data;
    
    if (options.format === 'csv') {
      const csvData = baggages.map((b: any) => ({
        'Tag RFID': b.tagNumber || '-',
        'Passager ID': b.passengerId,
        'Statut': b.status,
        'Type': b.type || 'Standard',
        'Poids (kg)': b.weight || 'N/A',
        'Date Check': b.checkedAt,
        'Agent': b.checkedBy,
        'Date Arrivée': b.arrivedAt || 'N/A'
      }));
      
      const csv = toCSV(csvData, options);
      const filename = `bagages_${airportCode || 'all'}_${Date.now()}.csv`;
      downloadFile(csv, filename);
    } else {
      const json = JSON.stringify(baggages, null, 2);
      const filename = `bagages_${airportCode || 'all'}_${Date.now()}.json`;
      downloadFile(json, filename, 'application/json');
    }
  } catch (error) {
    console.error('Erreur lors de l\'export des bagages:', error);
    throw error;
  }
}

/**
 * Exporter les données d'embarquement
 */
export async function exportBoarding(
  apiUrl: string,
  token: string,
  airportCode?: string,
  options: ExportOptions = { format: 'csv', includeHeaders: true }
): Promise<void> {
  try {
    const params: any = {};
    if (airportCode) params.airportCode = airportCode;
    
    const response = await axios.get(`${apiUrl}/api/v1/boarding`, {
      headers: { Authorization: `Bearer ${token}` },
      params
    });
    
    const boardingStatuses = response.data;
    
    if (options.format === 'csv') {
      const csvData = boardingStatuses.map((b: any) => ({
        'Passager ID': b.passengerId,
        'Embarqué': b.boarded ? 'Oui' : 'Non',
        'Date Embarquement': b.boardedAt || 'N/A',
        'Agent': b.boardedBy || 'N/A'
      }));
      
      const csv = toCSV(csvData, options);
      const filename = `embarquement_${airportCode || 'all'}_${Date.now()}.csv`;
      downloadFile(csv, filename);
    } else {
      const json = JSON.stringify(boardingStatuses, null, 2);
      const filename = `embarquement_${airportCode || 'all'}_${Date.now()}.json`;
      downloadFile(json, filename, 'application/json');
    }
  } catch (error) {
    console.error('Erreur lors de l\'export des embarquements:', error);
    throw error;
  }
}

/**
 * Importer des passagers depuis un CSV
 */
export async function importPassengers(
  apiUrl: string,
  token: string,
  csvContent: string,
  airportCode: string
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    imported: 0,
    errors: [],
    skipped: 0
  };
  
  try {
    const rows = parseCSV(csvContent);
    
    if (rows.length === 0) {
      result.errors.push('Fichier CSV vide');
      return result;
    }
    
    const passengers = rows.map(row => ({
      pnr: row['PNR'] || row['pnr'],
      fullName: row['Nom Complet'] || row['fullName'] || `${row['Prénom']} ${row['Nom']}`,
      firstName: row['Prénom'] || row['firstName'],
      lastName: row['Nom'] || row['lastName'],
      flightNumber: row['Vol'] || row['flightNumber'],
      airline: row['Compagnie'] || row['airline'],
      departure: row['Départ'] || row['departure'] || airportCode,
      arrival: row['Arrivée'] || row['arrival'],
      flightTime: row['Heure'] || row['flightTime'],
      seatNumber: row['Siège'] || row['seatNumber'],
      baggageCount: parseInt(row['Bagages'] || row['baggageCount'] || '0'),
      checkedInAt: new Date().toISOString(),
      synced: false
    }));
    
    // Filtrer les passagers invalides
    const validPassengers = passengers.filter(p => {
      if (!p.pnr || !p.fullName || !p.flightNumber) {
        result.skipped++;
        result.errors.push(`Passager ignoré: données manquantes (PNR: ${p.pnr})`);
        return false;
      }
      return true;
    });
    
    if (validPassengers.length === 0) {
      result.errors.push('Aucun passager valide à importer');
      return result;
    }
    
    // Envoyer à l'API
    const response = await axios.post(
      `${apiUrl}/api/v1/passengers/sync`,
      { passengers: validPassengers },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    result.success = true;
    result.imported = response.data.created || validPassengers.length;
    
  } catch (error: any) {
    result.errors.push(error.message || 'Erreur inconnue');
  }
  
  return result;
}

/**
 * Importer des bagages depuis un CSV
 */
export async function importBaggages(
  apiUrl: string,
  token: string,
  csvContent: string
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    imported: 0,
    errors: [],
    skipped: 0
  };
  
  try {
    const rows = parseCSV(csvContent);
    
    if (rows.length === 0) {
      result.errors.push('Fichier CSV vide');
      return result;
    }
    
    const baggages = rows.map(row => ({
      passengerId: row['Passager ID'] || row['passengerId'],
      tagNumber: row['Tag RFID'] || row['RFID Tag'] || row['tagNumber'],
      status: row['Statut'] || row['status'] || 'checked',
      type: row['Type'] || row['type'] || 'Standard',
      weight: parseFloat(row['Poids (kg)'] || row['weight'] || '0'),
      checkedAt: new Date().toISOString(),
      synced: false
    }));
    
    // Filtrer les bagages invalides
    const validBaggages = baggages.filter(b => {
      if (!b.passengerId || !b.tagNumber) {
        result.skipped++;
        result.errors.push(`Bagage ignoré: données manquantes (Tag: ${b.tagNumber})`);
        return false;
      }
      return true;
    });
    
    if (validBaggages.length === 0) {
      result.errors.push('Aucun bagage valide à importer');
      return result;
    }
    
    // Envoyer à l'API
    const response = await axios.post(
      `${apiUrl}/api/v1/baggage/sync`,
      { baggages: validBaggages },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    result.success = true;
    result.imported = response.data.created || validBaggages.length;
    
  } catch (error: any) {
    result.errors.push(error.message || 'Erreur inconnue');
  }
  
  return result;
}

/**
 * Lire un fichier en tant que texte
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}
