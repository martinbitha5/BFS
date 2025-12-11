import { supabase } from '../src/config/database';

async function testRawScans() {
  console.log('🔍 Vérification des raw_scans...\n');

  try {
    // 1. Compter les raw_scans
    const { count, error: countError } = await supabase
      .from('raw_scans')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    console.log(`📊 Total raw_scans: ${count}\n`);

    if (count === 0) {
      console.log('⚠️  AUCUN raw_scan trouvé dans la base !');
      console.log('   → Scannez des boarding pass dans l\'application mobile d\'abord\n');
      return;
    }

    // 2. Récupérer les 5 premiers raw_scans
    const { data: scans, error: scanError } = await supabase
      .from('raw_scans')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (scanError) throw scanError;

    console.log(`📄 Les 5 derniers scans:\n`);
    
    scans?.forEach((scan, index) => {
      console.log(`--- Scan #${index + 1} ---`);
      console.log(`  ID: ${scan.id}`);
      console.log(`  Type: ${scan.scan_type}`);
      console.log(`  Aéroport: ${scan.airport_code}`);
      console.log(`  Status check-in: ${scan.status_checkin}`);
      console.log(`  Status baggage: ${scan.status_baggage}`);
      console.log(`  Données brutes (100 premiers chars): ${scan.raw_data?.substring(0, 100)}...`);
      console.log(`  Créé le: ${scan.created_at}`);
      console.log('');
    });

    // 3. Compter les passagers
    const { count: passCount, error: passError } = await supabase
      .from('passengers')
      .select('*', { count: 'exact', head: true });

    if (passError) throw passError;

    console.log(`\n👥 Total passagers dans la table: ${passCount}`);

    // 4. Récupérer les 5 derniers passagers
    const { data: passengers, error: passListError } = await supabase
      .from('passengers')
      .select('*')
      .order('checked_in_at', { ascending: false })
      .limit(5);

    if (passListError) throw passListError;

    console.log(`\n📋 Les 5 derniers passagers:\n`);
    
    passengers?.forEach((p, index) => {
      console.log(`  ${index + 1}. ${p.full_name} (PNR: ${p.pnr}) - Vol: ${p.flight_number}`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testRawScans();
