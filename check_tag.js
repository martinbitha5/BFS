const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'your-service-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTag() {
  const tag = '4071303760';
  console.log('🔍 Vérification du tag:', tag);
  
  // Chercher par baggage_base_number
  const { data: passengers, error } = await supabase
    .from('passengers')
    .select('*')
    .eq('baggage_base_number', tag);
    
  if (error) {
    console.error('❌ Erreur:', error);
  } else if (passengers && passengers.length > 0) {
    console.log('✅ Passager trouvé:');
    passengers.forEach(p => {
      console.log('  - Nom:', p.full_name);
      console.log('  - PNR:', p.pnr);
      console.log('  - baggage_count:', p.baggage_count);
      console.log('  - baggage_base_number:', p.baggage_base_number);
    });
  } else {
    console.log('❌ Aucun passager trouvé avec ce baggage_base_number');
    
    // Essayons aussi de chercher par baggage_base_number + 1 (au cas où)
    console.log('🔍 Essayons baggage_base_number + 1...');
    const tagPlus1 = (parseInt(tag) + 1).toString();
    const { data: passengers2, error: error2 } = await supabase
      .from('passengers')
      .select('*')
      .eq('baggage_base_number', tagPlus1);
      
    if (passengers2 && passengers2.length > 0) {
      console.log('✅ Passager trouvé avec tag+1:');
      passengers2.forEach(p => {
        console.log('  - Nom:', p.full_name);
        console.log('  - PNR:', p.pnr);
        console.log('  - baggage_count:', p.baggage_count);
        console.log('  - baggage_base_number:', p.baggage_base_number);
      });
    }
  }
}

checkTag().catch(console.error);