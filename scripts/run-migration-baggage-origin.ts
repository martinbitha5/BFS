import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'your-service-key';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('📦 Running baggage origin column migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/add-baggage-origin-column.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Migration content:');
    console.log(migrationSQL);
    
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Origin column added to baggages table');
    
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  }
}

// Execute if called directly
if (require.main === module) {
  runMigration();
}

export { runMigration };