import { supabase } from '../src/config/database';

async function debugRawScans() {
  console.log('🔍 Analyse détaillée des raw_scans...\n');

  try {
    // Récupérer les raw_scans récents
    const { data: scans, error } = await supabase
      .from('raw_scans')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    if (!scans || scans.length === 0) {
      console.log('⚠️  Aucun raw_scan trouvé\n');
      return;
    }

    console.log(`📄 ${scans.length} scans trouvés\n`);
    
    scans.forEach((scan, index) => {
      console.log(`═══════════════════════════════════════`);
      console.log(`SCAN #${index + 1}`);
      console.log(`═══════════════════════════════════════`);
      console.log(`ID: ${scan.id}`);
      console.log(`Type: ${scan.scan_type}`);
      console.log(`Aéroport: ${scan.airport_code}`);
      console.log(`Status check-in: ${scan.status_checkin}`);
      console.log(`Status baggage: ${scan.status_baggage}`);
      console.log(`Tag RFID bagage: ${scan.baggage_rfid_tag || 'N/A'}`);
      console.log(`\nDONNÉES BRUTES COMPLÈTES:`);
      console.log(scan.raw_data);
      console.log(`\nLongueur: ${scan.raw_data?.length || 0} caractères`);
      console.log(`Créé le: ${scan.created_at}\n`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

debugRawScans();
