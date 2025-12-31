/**
 * Script de migration de la base de données SQLite (app mobile)
 * Ajoute les champs manquants pour assurer la cohérence avec PostgreSQL
 */

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'bfs.db';

async function migrateDatabase() {
  console.log('[MIGRATION] Début de la migration de la base de données...');
  
  try {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    
    // Vérifier si la migration a déjà été effectuée
    const result = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM pragma_table_info('baggages') WHERE name='weight'"
    );
    
    if (result && result.count > 0) {
      console.log('[MIGRATION] ✅ Migration déjà effectuée, rien à faire.');
      return;
    }
    
    console.log('[MIGRATION] Ajout des nouveaux champs dans la table baggages...');
    
    // Sauvegarder les données existantes
    const existingBaggages = await db.getAllAsync('SELECT * FROM baggages');
    console.log(`[MIGRATION] ${existingBaggages.length} bagages existants à migrer`);
    
    // Recréer la table avec les nouveaux champs
    await db.execAsync(`
      -- Créer une nouvelle table temporaire avec les nouveaux champs
      CREATE TABLE baggages_new (
        id TEXT PRIMARY KEY,
        passenger_id TEXT NOT NULL,
        tag_number TEXT UNIQUE NOT NULL,
        expected_tag TEXT,
        status TEXT NOT NULL DEFAULT 'checked',
        weight REAL,
        flight_number TEXT,
        airport_code TEXT,
        current_location TEXT,
        checked_at TEXT,
        checked_by TEXT,
        arrived_at TEXT,
        arrived_by TEXT,
        delivered_at TEXT,
        last_scanned_at TEXT,
        last_scanned_by TEXT,
        synced INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (passenger_id) REFERENCES passengers(id)
      );
      
      -- Copier les données existantes
      INSERT INTO baggages_new (
        id, passenger_id, tag_number, expected_tag, status,
        checked_at, checked_by, arrived_at, arrived_by,
        synced, created_at, updated_at
      )
      SELECT 
        id, passenger_id, tag_number, expected_tag, status,
        checked_at, checked_by, arrived_at, arrived_by,
        synced, created_at, updated_at
      FROM baggages;
      
      -- Supprimer l'ancienne table
      DROP TABLE baggages;
      
      -- Renommer la nouvelle table
      ALTER TABLE baggages_new RENAME TO baggages;
      
      -- Recréer les index
      CREATE INDEX idx_baggages_passenger_id ON baggages(passenger_id);
      CREATE INDEX idx_baggages_tag_number ON baggages(tag_number);
      CREATE INDEX idx_baggages_airport_code ON baggages(airport_code);
      CREATE INDEX idx_baggages_flight_number ON baggages(flight_number);
    `);
    
    console.log('[MIGRATION] ✅ Table baggages migrée avec succès');
    
    // Vérifier le nombre de lignes après migration
    const newCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM baggages'
    );
    console.log(`[MIGRATION] ${newCount?.count} bagages après migration`);
    
    if (newCount?.count !== existingBaggages.length) {
      throw new Error('Perte de données détectée lors de la migration !');
    }
    
    console.log('[MIGRATION] ✅ Migration terminée avec succès');
    
  } catch (error) {
    console.error('[MIGRATION] ❌ Erreur lors de la migration:', error);
    throw error;
  }
}

// Export pour utilisation dans l'app
export { migrateDatabase };

// Exécution si lancé directement
if (require.main === module) {
  migrateDatabase()
    .then(() => {
      console.log('[MIGRATION] Script terminé');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[MIGRATION] Échec du script:', error);
      process.exit(1);
    });
}
