const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ncxnouvkjnqldhhrkjcq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jeG5vdXZram5xbGRoaHJramNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTAxOTQzOSwiZXhwIjoyMDgwNTk1NDM5fQ.hMt19SK1KpQjJV92JWPHhv1cvGr2PanGRkguelDylT8';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function showRawScans() {
  console.log('📄 Exemples de RAW SCANS:\n');

  const { data, error } = await supabase
    .from('raw_scans')
    .select('*')
    .eq('airport_code', 'FIH')
    .limit(5);

  if (error) {
    console.error('❌ Erreur:', error);
    return;
  }

  data.forEach((scan, i) => {
    console.log(`\n========== SCAN ${i + 1} ==========`);
    console.log(`Type: ${scan.scan_type}`);
    console.log(`Raw Data: ${scan.raw_data}`);
    console.log(`Baggage RFID: ${scan.baggage_rfid_tag || 'N/A'}`);
    console.log(`Status Checkin: ${scan.status_checkin}`);
    console.log(`Status Baggage: ${scan.status_baggage}`);
  });
}

showRawScans();
