import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { AuditLog } from '../types/audit.types';

/**
 * Export des logs d'audit vers Excel avec logo et styles professionnels
 * Filtre automatiquement les actions du support (sauf superviseur)
 */
export const exportAuditLogsToExcel = async (
  auditLogs: AuditLog[],
  startDate?: string,
  endDate?: string,
  filters?: {
    action?: string;
    entity_type?: string;
    search?: string;
  }
) => {
  if (!auditLogs || auditLogs.length === 0) {
    throw new Error('Aucun log d\'audit à exporter');
  }

  // Filtrer les logs pour exclure les actions du support (sauf superviseur)
  const filteredLogs = auditLogs.filter(log => {
    // Garder uniquement :
    // 1. Les actions de superviseur (user_role = 'supervisor')
    // 2. Les actions des utilisateurs de l'application mobile (user_role = 'agent', 'user', etc.)
    // 3. Exclure les actions du support staff (user_role = 'support')
    
    if (log.user_role === 'support' || log.user_role === 'admin') {
      return false; // Exclure le support staff
    }
    
    // Si c'est un superviseur ou un agent/utilisateur, on garde
    return ['supervisor', 'agent', 'user', 'passenger'].includes(log.user_role || '');
  });

  if (filteredLogs.length === 0) {
    throw new Error('Aucun log pertinent à exporter (seul le superviseur et les utilisateurs de l\'application sont visibles)');
  }

  // Créer le workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Baggage Found Solution - Support Portal';
  workbook.created = new Date();
  workbook.lastModifiedBy = 'Support Portal';
  workbook.modified = new Date();

  // Texte de période et filtres
  let periodText = startDate && endDate
    ? `Du ${new Date(startDate).toLocaleDateString('fr-FR')} au ${new Date(endDate).toLocaleDateString('fr-FR')}`
    : 'Toutes les données';

  const filterTexts = [];
  if (filters?.action) filterTexts.push(`Action: ${filters.action}`);
  if (filters?.entity_type) filterTexts.push(`Type: ${filters.entity_type}`);
  if (filters?.search) filterTexts.push(`Recherche: ${filters.search}`);
  
  if (filterTexts.length > 0) {
    periodText += ` (${filterTexts.join(', ')})`;
  }

  // ===== FEUILLE 1: INFORMATIONS AVEC LOGO =====
  const infoSheet = workbook.addWorksheet('Informations', {
    properties: { tabColor: { argb: 'FF4472C4' } }
  });

  // Charger le logo (essayer plusieurs chemins possibles)
  try {
    console.log('[EXPORT AUDIT] Chargement du logo...');
    const logoPaths = [
      '/assets/logo-ats-csi.png',
      '/logo-ats-csi.png',
      '/src/assets/logo-ats-csi.png'
    ];
    
    let logoLoaded = false;
    for (const logoPath of logoPaths) {
      try {
        const response = await fetch(logoPath);
        if (response.ok) {
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();

          const imageId = workbook.addImage({
            buffer: arrayBuffer,
            extension: 'png',
          });

          // Ajouter le logo dans la feuille
          infoSheet.addImage(imageId, {
            tl: { col: 0, row: 0 },
            ext: { width: 250, height: 120 }
          });
          
          console.log('[EXPORT AUDIT] Logo ajouté');
          logoLoaded = true;
          break;
        }
      } catch (e) {
        continue; // Essayer le prochain chemin
      }
    }
    
    if (!logoLoaded) {
      console.log('[EXPORT AUDIT] Logo non trouvé, export sans logo');
    }
  } catch (error) {
    console.error('[EXPORT AUDIT] Erreur logo:', error);
  }

  // Informations principales (commencer après le logo)
  infoSheet.getCell('A8').value = 'RAPPORT D\'AUDIT - SUPERVISION ET APPLICATION MOBILE';
  infoSheet.getCell('A8').font = { bold: true, size: 16, color: { argb: 'FF1F2937' } };

  infoSheet.getCell('A9').value = 'Baggage Found Solution - African Transport Systems';
  infoSheet.getCell('A9').font = { italic: true, size: 11, color: { argb: 'FF6B7280' } };

  infoSheet.getCell('A11').value = 'Date d\'export';
  infoSheet.getCell('B11').value = new Date().toLocaleString('fr-FR');
  infoSheet.getCell('B11').font = { bold: true };

  infoSheet.getCell('A12').value = 'Période analysée';
  infoSheet.getCell('B12').value = periodText;
  infoSheet.getCell('B12').font = { bold: true };

  infoSheet.getCell('A14').value = 'STATISTIQUES D\'AUDIT';
  infoSheet.getCell('A14').font = { bold: true, size: 14, color: { argb: 'FF2563EB' } };

  // Calculer les statistiques
  const totalLogs = filteredLogs.length;
  const supervisorLogs = filteredLogs.filter(log => log.user_role === 'supervisor').length;
  const agentLogs = filteredLogs.filter(log => log.user_role === 'agent').length;
  const userLogs = filteredLogs.filter(log => log.user_role === 'user').length;
  
  const uniqueUsers = new Set(filteredLogs.map(log => log.user_id)).size;
  const uniqueActions = new Set(filteredLogs.map(log => log.action)).size;
  const uniqueEntityTypes = new Set(filteredLogs.map(log => log.entity_type)).size;

  const statsData = [
    ['Total des actions enregistrées', totalLogs],
    ['', ''],
    ['Actions du Superviseur', supervisorLogs],
    ['Actions des Agents', agentLogs],
    ['Actions des Utilisateurs', userLogs],
    ['', ''],
    ['Utilisateurs uniques', uniqueUsers],
    ['Types d\'actions différents', uniqueActions],
    ['Types d\'entités différentes', uniqueEntityTypes],
  ];

  statsData.forEach((row, index) => {
    const rowNum = 15 + index;
    infoSheet.getCell(`A${rowNum}`).value = row[0];
    infoSheet.getCell(`A${rowNum}`).font = { bold: true };
    infoSheet.getCell(`B${rowNum}`).value = row[1];
    if (row[0]) {
      infoSheet.getCell(`B${rowNum}`).font = { bold: true };
    }
  });

  // Largeurs de colonnes
  infoSheet.getColumn('A').width = 40;
  infoSheet.getColumn('B').width = 25;

  // ===== FEUILLE 2: LOGS D\'AUDIT DÉTAILLÉS =====
  const logsSheet = workbook.addWorksheet('Logs d\'Audit', {
    properties: { tabColor: { argb: 'FF22C55E' } }
  });

  // En-têtes
  const headers = [
    'Date & Heure',
    'Utilisateur',
    'Rôle',
    'Action',
    'Type d\'Entité',
    'Entité ID',
    'Description',
    'Détails',
    'Aéroport',
    'Adresse IP'
  ];
  logsSheet.addRow(headers);

  // Style des en-têtes
  const headerRow = logsSheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' }
  };
  headerRow.height = 30;
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // Ajouter les données
  filteredLogs.forEach((log) => {
    const row = logsSheet.addRow([
      new Date(log.created_at).toLocaleString('fr-FR'),
      log.user_name || log.user_email || 'Utilisateur inconnu',
      log.user_role || '-',
      log.action,
      log.entity_type || '-',
      log.entity_id || '-',
      log.description || '-',
      log.details ? JSON.stringify(log.details, null, 2) : '-',
      log.airport_code || '-',
      log.ip_address || '-'
    ]);

    // Appliquer des couleurs selon le rôle
    const roleCell = row.getCell(3); // Colonne Rôle
    if (log.user_role === 'supervisor') {
      roleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF90EE90' } // Vert clair pour superviseur
      };
    } else if (log.user_role === 'agent') {
      roleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFF99' } // Jaune clair pour agents
      };
    }
  });

  // Largeurs de colonnes optimisées
  logsSheet.getColumn(1).width = 20;  // Date & Heure
  logsSheet.getColumn(2).width = 25;  // Utilisateur
  logsSheet.getColumn(3).width = 15;  // Rôle
  logsSheet.getColumn(4).width = 20;  // Action
  logsSheet.getColumn(5).width = 20;  // Type d'Entité
  logsSheet.getColumn(6).width = 15;  // Entité ID
  logsSheet.getColumn(7).width = 35;  // Description
  logsSheet.getColumn(8).width = 40;  // Détails
  logsSheet.getColumn(9).width = 12;  // Aéroport
  logsSheet.getColumn(10).width = 15; // Adresse IP

  // Bordures et alignement
  logsSheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      });
    }
  });

  // ===== FEUILLE 3: RÉSUMÉ PAR RÔLE =====
  const summarySheet = workbook.addWorksheet('Résumé par Rôle', {
    properties: { tabColor: { argb: 'FFF59E0B' } }
  });

  // Calculer les statistiques par rôle
  const roleStats = filteredLogs.reduce((acc, log) => {
    const role = log.user_role || 'Inconnu';
    if (!acc[role]) {
      acc[role] = {
        count: 0,
        actions: new Set<string>(),
        entities: new Set<string>(),
        users: new Set<string>()
      };
    }
    acc[role].count++;
    acc[role].actions.add(log.action);
    if (log.entity_type) acc[role].entities.add(log.entity_type);
    if (log.user_id) acc[role].users.add(log.user_id);
    return acc;
  }, {} as Record<string, { count: number; actions: Set<string>; entities: Set<string>; users: Set<string> }>);

  // En-têtes du résumé
  summarySheet.addRow(['Rôle', 'Nombre d\'actions', 'Actions différentes', 'Types d\'entités', 'Utilisateurs uniques']);
  const summaryHeaderRow = summarySheet.getRow(1);
  summaryHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  summaryHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDC2626' }
  };
  summaryHeaderRow.height = 25;
  summaryHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // Données du résumé
  Object.entries(roleStats).forEach(([role, stats]) => {
    const row = summarySheet.addRow([
      role,
      stats.count,
      stats.actions.size,
      stats.entities.size,
      stats.users.size
    ]);

    // Colorer selon le rôle
    const roleCell = row.getCell(1);
    if (role === 'supervisor') {
      roleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF90EE90' }
      };
    } else if (role === 'agent') {
      roleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFF99' }
      };
    }
  });

  // Largeurs et style
  summarySheet.getColumn(1).width = 20; // Rôle
  summarySheet.getColumn(2).width = 20; // Nombre d'actions
  summarySheet.getColumn(3).width = 20; // Actions différentes
  summarySheet.getColumn(4).width = 20; // Types d'entités
  summarySheet.getColumn(5).width = 20; // Utilisateurs uniques

  summarySheet.eachRow((row, rowNumber) => {
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

  // Générer et sauvegarder le fichier
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const dateStr = new Date().toISOString().split('T')[0];
  const dateRange = startDate && endDate ? `_${startDate}_${endDate}` : '';
  const filterSuffix = filters ? '_filtre' : '';
  const fileName = `BFS_Audit_Supervision_${dateStr}${dateRange}${filterSuffix}.xlsx`;

  saveAs(blob, fileName);
  
  console.log(`[EXPORT AUDIT] Export réussi: ${filteredLogs.length} logs exportés`);
};