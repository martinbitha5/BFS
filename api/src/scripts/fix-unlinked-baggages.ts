/**
 * Script pour lier les bagages orphelins aux passagers
 * Basé sur le numéro de vol et la proximité des tags RFID
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://tifqyplgbgtfutvkdgnl.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpZnF5cGxnYmd0ZnV0dmtkZ25sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI5ODcwOTQsImV4cCI6MjA0ODU2MzA5NH0.aB7K8KDBclOX8YuNp4DN7fZ5Q9PuZvJVf28V9m3-m1s';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixUnlinkedBaggages() {
  console.log('=== Correction des bagages non liés ===\n');

  // 1. Récupérer les bagages sans passenger_id
  const { data: unlinkedBaggages, error: bagError } = await supabase
    .from('baggages')
    .select('*')
    .is('passenger_id', null);

  if (bagError) {
    console.error('Erreur récupération bagages:', bagError);
    return;
  }

  console.log(`Bagages non liés trouvés: ${unlinkedBaggages?.length || 0}`);

  if (!unlinkedBaggages || unlinkedBaggages.length === 0) {
    console.log('Aucun bagage à corriger.');
    return;
  }

  // 2. Pour chaque bagage non lié, chercher un passager correspondant
  for (const baggage of unlinkedBaggages) {
    console.log(`\nTraitement du bagage: ${baggage.tag_number}`);
    console.log(`  Vol: ${baggage.flight_number}, Aéroport: ${baggage.airport_code}`);

    // Chercher les passagers du même vol avec des bagages manquants
    const { data: passengers, error: passError } = await supabase
      .from('passengers')
      .select('*, baggages(*)')
      .eq('flight_number', baggage.flight_number)
      .eq('airport_code', baggage.airport_code);

    if (passError || !passengers) {
      console.log(`  Erreur ou pas de passagers trouvés`);
      continue;
    }

    // Trouver un passager qui a moins de bagages liés que son baggage_count
    for (const passenger of passengers) {
      const linkedBaggagesCount = passenger.baggages?.length || 0;
      const expectedBaggages = passenger.baggage_count || 0;

      if (linkedBaggagesCount < expectedBaggages) {
        console.log(`  Candidat: ${passenger.full_name} (${linkedBaggagesCount}/${expectedBaggages} bagages)`);
        
        // Vérifier si les tags sont proches (même série)
        const existingTags = passenger.baggages?.map((b: any) => b.tag_number) || [];
        const isRelated = existingTags.some((tag: string) => {
          const tagNum = parseInt(tag);
          const currentTagNum = parseInt(baggage.tag_number);
          // Tags consécutifs ou très proches
          return Math.abs(tagNum - currentTagNum) <= 5;
        });

        if (isRelated || linkedBaggagesCount === 0) {
          // Lier le bagage au passager
          const { error: updateError } = await supabase
            .from('baggages')
            .update({ passenger_id: passenger.id })
            .eq('id', baggage.id);

          if (updateError) {
            console.log(`  ❌ Erreur liaison: ${updateError.message}`);
          } else {
            console.log(`  ✅ Bagage ${baggage.tag_number} lié à ${passenger.full_name}`);
          }
          break;
        }
      }
    }
  }

  console.log('\n=== Correction terminée ===');
}

// Exécuter
fixUnlinkedBaggages().catch(console.error);
