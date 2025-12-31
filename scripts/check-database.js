const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ncxnouvkjnqldhhrkjcq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jeG5vdXZram5xbGRoaHJramNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTAxOTQzOSwiZXhwIjoyMDgwNTk1NDM5fQ.hMt19SK1KpQjJV92JWPHhv1cvGr2PanGRkguelDylT8';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkDatabase() {
  console.log('🔍 Vérification de la base de données...\n');

  try {
    // 1. Raw scans
    const { data: rawScans, error: rawError } = await supabase
      .from('raw_scans')
      .select('*')
      .eq('airport_code', 'FIH');

    if (rawError) throw rawError;

    console.log(`📊 RAW SCANS: ${rawScans?.length || 0}`);
    if (rawScans && rawScans.length > 0) {
      console.log('   - Boarding Pass:', rawScans.filter(s => s.scan_type === 'boarding_pass').length);
      console.log('   - Baggage Tag:', rawScans.filter(s => s.scan_type === 'baggage_tag').length);
      console.log('\n   Exemples:');
      rawScans.slice(0, 2).forEach((scan, i) => {
        console.log(`   [${i + 1}] Type: ${scan.scan_type}`);
        console.log(`       Data: ${scan.raw_data?.substring(0, 50)}...`);
      });
    }

    // 2. Passagers
    const { data: passengers, error: passError } = await supabase
      .from('passengers')
      .select('*')
      .eq('airport_code', 'FIH');

    if (passError) throw passError;

    console.log(`\n👥 PASSAGERS: ${passengers?.length || 0}`);
    if (passengers && passengers.length > 0) {
      passengers.slice(0, 3).forEach((p, i) => {
        console.log(`   [${i + 1}] ${p.full_name} - PNR: ${p.pnr} - Vol: ${p.flight_number}`);
      });
    }

    // 3. Bagages internationaux
    const { data: intlBags, error: intlError } = await supabase
      .from('international_baggages')
      .select('*')
      .eq('airport_code', 'FIH');

    if (intlError) throw intlError;

    console.log(`\n🧳 BAGAGES INTERNATIONAUX: ${intlBags?.length || 0}`);
    if (intlBags && intlBags.length > 0) {
      intlBags.slice(0, 3).forEach((b, i) => {
        console.log(`   [${i + 1}] Tag: ${b.tag_number} - Statut: ${b.status}`);
      });
    }

    // 4. Bagages normaux
    const { data: bags, error: bagsError } = await supabase
      .from('baggages')
      .select('*')
      .eq('airport_code', 'FIH');

    if (bagsError) throw bagsError;

    console.log(`\n💼 BAGAGES NORMAUX: ${bags?.length || 0}`);

    console.log('\n✅ Vérification terminée !');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

checkDatabase();
