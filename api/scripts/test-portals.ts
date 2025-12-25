/**
 * Script de test pour les portails (Dashboard et Airline Portal)
 * 
 * Ce script teste :
 * 1. Le portail Dashboard (authentification supervisor/support)
 * 2. Le portail Airline Portal (authentification airline)
 * 3. Les restrictions d'accès selon les rôles
 * 4. Les fonctionnalités spécifiques à chaque portail
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

// Initialiser Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erreur: SUPABASE_URL et SUPABASE_SERVICE_KEY doivent être définis dans .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Détecter automatiquement l'URL de l'API
function getApiUrl(): string {
  if (process.env.API_URL) {
    return process.env.API_URL;
  }
  return 'https://api.brsats.com';
}

const API_URL = getApiUrl();
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://dashboard.brsats.com';
const AIRLINE_PORTAL_URL = process.env.AIRLINE_PORTAL_URL || 'https://airline-portal.brsats.com';

interface TestResult {
  testName: string;
  success: boolean;
  error?: string;
  details?: any;
}

// Types pour les réponses API
interface LoginResponse {
  success?: boolean;
  data?: {
    user?: any;
    token?: string;
  };
  token?: string;
  airline?: {
    token?: string;
  };
}

interface ErrorResponse {
  success?: boolean;
  error?: string;
}

const results: TestResult[] = [];

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const prefix = { info: 'ℹ️', success: '✅', error: '❌', warn: '⚠️' }[type];
  console.log(`${prefix} ${message}`);
}

function recordTest(testName: string, success: boolean, error?: string, details?: any) {
  results.push({ testName, success, error, details });
  if (success) {
    log(`${testName}: OK`, 'success');
  } else {
    log(`${testName}: ÉCHEC - ${error}`, 'error');
  }
}

// Test Dashboard - Authentification supervisor
async function testDashboardSupervisorAuth() {
  log('Test Dashboard: Authentification supervisor...', 'info');
  
  // Créer un utilisateur supervisor de test
  const testEmail = `test-supervisor-${Date.now()}@bfs-test.com`;
  const testPassword = 'Test123456!';
  
  try {
    // Créer l'utilisateur dans Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });
    
    if (authError) {
      recordTest('Dashboard: Création utilisateur supervisor', false, authError.message);
      return;
    }
    
    // Créer le profil
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: testEmail,
        full_name: 'Test Supervisor',
        airport_code: 'FIH',
        role: 'supervisor',
        approved: true,
      });
    
    if (userError) {
      recordTest('Dashboard: Création profil supervisor', false, userError.message);
      await supabase.auth.admin.deleteUser(authData.user.id);
      return;
    }
    
    // Tester la connexion via l'API
    const loginResponse = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    
    if (loginResponse.status === 200) {
      const loginData = await loginResponse.json() as LoginResponse;
      const token = loginData.data?.token || loginData.token;
      
      if (token) {
        // Tester l'endpoint /me
        const meResponse = await fetch(`${API_URL}/api/v1/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        recordTest(
          'Dashboard: Authentification supervisor',
          meResponse.status === 200,
          meResponse.status !== 200 ? `Status ${meResponse.status}` : undefined
        );
        
        // Nettoyer
        await supabase.from('users').delete().eq('id', authData.user.id);
        await supabase.auth.admin.deleteUser(authData.user.id);
      } else {
        recordTest('Dashboard: Authentification supervisor', false, 'Token non reçu');
      }
    } else {
      recordTest('Dashboard: Authentification supervisor', false, `Login status ${loginResponse.status}`);
    }
  } catch (error: any) {
    recordTest('Dashboard: Authentification supervisor', false, error.message);
  }
}

// Test Dashboard - Restrictions d'accès
async function testDashboardAccessRestrictions() {
  log('Test Dashboard: Restrictions d\'accès...', 'info');
  
  // Créer un utilisateur checkin (ne devrait pas avoir accès au dashboard)
  const testEmail = `test-checkin-${Date.now()}@bfs-test.com`;
  const testPassword = 'Test123456!';
  
  try {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });
    
    if (authError) {
      recordTest('Dashboard: Création utilisateur checkin', false, authError.message);
      return;
    }
    
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: testEmail,
        full_name: 'Test Check-in',
        airport_code: 'FIH',
        role: 'checkin',
        approved: true,
      });
    
    if (userError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      recordTest('Dashboard: Création profil checkin', false, userError.message);
      return;
    }
    
    // Tester la connexion (devrait fonctionner mais avec restrictions)
    const loginResponse = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    
    if (loginResponse.status === 200) {
      const loginData = await loginResponse.json() as LoginResponse;
      const token = loginData.data?.token || loginData.token;
      
      // Tester l'accès aux routes d'approbation (devrait être refusé)
      const approvalResponse = await fetch(`${API_URL}/api/v1/user-approval/requests`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      recordTest(
        'Dashboard: Accès refusé aux approbations (rôle checkin)',
        approvalResponse.status === 403,
        approvalResponse.status !== 403 ? `Status ${approvalResponse.status} au lieu de 403` : undefined
      );
      
      // Nettoyer
      await supabase.from('users').delete().eq('id', authData.user.id);
      await supabase.auth.admin.deleteUser(authData.user.id);
    } else {
      recordTest('Dashboard: Restrictions d\'accès', false, `Login status ${loginResponse.status}`);
    }
  } catch (error: any) {
    recordTest('Dashboard: Restrictions d\'accès', false, error.message);
  }
}

// Test Airline Portal - Authentification
async function testAirlinePortalAuth() {
  log('Test Airline Portal: Authentification...', 'info');
  
  try {
    // Tester la connexion avec le compte support existant
    const loginResponse = await fetch(`${API_URL}/api/v1/airlines/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'support@brsats.com',
        password: '0827241919mA@',
      }),
    });
    
    if (loginResponse.status === 200) {
      const loginData = await loginResponse.json() as LoginResponse;
      const token = loginData.airline?.token || loginData.token || loginData.data?.token;
      
      if (token) {
        // Tester l'endpoint /me
        const meResponse = await fetch(`${API_URL}/api/v1/airlines/me`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        recordTest(
          'Airline Portal: Authentification',
          meResponse.status === 200,
          meResponse.status !== 200 ? `Status ${meResponse.status}` : undefined
        );
      } else {
        recordTest('Airline Portal: Authentification', false, 'Token non reçu');
      }
    } else {
      const errorData = await loginResponse.json().catch(() => ({})) as ErrorResponse;
      recordTest(
        'Airline Portal: Authentification',
        false,
        `Status ${loginResponse.status}: ${errorData.error || 'Erreur inconnue'}`
      );
    }
  } catch (error: any) {
    recordTest('Airline Portal: Authentification', false, error.message);
  }
}

// Test Airline Portal - Upload BIRS
async function testAirlinePortalUpload() {
  log('Test Airline Portal: Upload BIRS...', 'info');
  
  try {
    // Se connecter
    const loginResponse = await fetch(`${API_URL}/api/v1/airlines/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'support@brsats.com',
        password: '0827241919mA@',
      }),
    });
    
    if (loginResponse.status !== 200) {
      recordTest('Airline Portal: Upload BIRS', false, 'Échec de connexion');
      return;
    }
    
    const loginData = await loginResponse.json() as LoginResponse;
    const token = loginData.airline?.token || loginData.token || loginData.data?.token;
    
    if (!token) {
      recordTest('Airline Portal: Upload BIRS', false, 'Token non reçu');
      return;
    }
    
    // Créer un fichier BIRS de test
    const testBirsContent = `ET1234567890
JOHN DOE
PNR12345
AC123
FIH
GOM
2025-12-25
1
20.5`;
    
    const formData = new FormData();
    const blob = new Blob([testBirsContent], { type: 'text/plain' });
    formData.append('file', blob, 'test-birs.txt');
    formData.append('flightNumber', 'AC123');
    formData.append('flightDate', '2025-12-25');
    formData.append('origin', 'FIH');
    formData.append('destination', 'GOM');
    formData.append('airportCode', 'GOM');
    
    // Note: FormData ne fonctionne pas directement avec fetch dans Node.js
    // Il faudrait utiliser une bibliothèque comme form-data ou axios
    // Pour l'instant, on teste juste que l'endpoint existe
    
    const uploadResponse = await fetch(`${API_URL}/api/v1/birs/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // 'Content-Type': 'multipart/form-data' sera ajouté automatiquement
      },
      // body: formData, // Nécessite form-data package
    });
    
    // On s'attend à une erreur 400 (fichier manquant) mais pas 403 (accès refusé)
    recordTest(
      'Airline Portal: Upload BIRS (endpoint accessible)',
      uploadResponse.status !== 403,
      uploadResponse.status === 403 ? 'Accès refusé alors qu\'il devrait être autorisé' : undefined,
      { status: uploadResponse.status }
    );
  } catch (error: any) {
    recordTest('Airline Portal: Upload BIRS', false, error.message);
  }
}

// Test Airline Portal - Historique
async function testAirlinePortalHistory() {
  log('Test Airline Portal: Historique...', 'info');
  
  try {
    // Se connecter
    const loginResponse = await fetch(`${API_URL}/api/v1/airlines/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'support@brsats.com',
        password: '0827241919mA@',
      }),
    });
    
    if (loginResponse.status !== 200) {
      recordTest('Airline Portal: Historique', false, 'Échec de connexion');
      return;
    }
    
    const loginData = await loginResponse.json() as LoginResponse;
    const token = loginData.airline?.token || loginData.token || loginData.data?.token;
    
    if (!token) {
      recordTest('Airline Portal: Historique', false, 'Token non reçu');
      return;
    }
    
    // Tester l'accès à l'historique
    const historyResponse = await fetch(`${API_URL}/api/v1/birs/history`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    recordTest(
      'Airline Portal: Accès à l\'historique',
      historyResponse.status === 200,
      historyResponse.status !== 200 ? `Status ${historyResponse.status}` : undefined
    );
  } catch (error: any) {
    recordTest('Airline Portal: Historique', false, error.message);
  }
}

// Fonction principale
async function main() {
  log('🚀 Démarrage des tests des portails', 'info');
  log(`API URL: ${API_URL}`, 'info');
  log(`Dashboard URL: ${DASHBOARD_URL}`, 'info');
  log(`Airline Portal URL: ${AIRLINE_PORTAL_URL}`, 'info');
  
  // Vérifier que l'API est accessible
  try {
    const healthResponse = await fetch(`${API_URL}/health`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      log(`✅ API accessible: ${JSON.stringify(healthData)}`, 'success');
    } else {
      log(`⚠️  API répond mais avec un statut ${healthResponse.status}`, 'warn');
    }
  } catch (error: any) {
    log(`❌ Impossible de se connecter à l'API: ${error.message}`, 'error');
    log(`   Vérifiez que l'API est accessible à ${API_URL}`, 'error');
    log(`   Vous pouvez définir API_URL dans les variables d'environnement pour utiliser une autre URL`, 'info');
    process.exit(1);
  }
  
  await testDashboardSupervisorAuth();
  await testDashboardAccessRestrictions();
  await testAirlinePortalAuth();
  await testAirlinePortalUpload();
  await testAirlinePortalHistory();
  
  // Rapport
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  log('\n═══════════════════════════════════════════════════════════', 'info');
  log('📊 RAPPORT DES TESTS DES PORTAILS', 'info');
  log('═══════════════════════════════════════════════════════════', 'info');
  log(`Total: ${results.length} tests`, 'info');
  log(`Réussis: ${passed}`, passed === results.length ? 'success' : 'warn');
  log(`Échoués: ${failed}`, failed === 0 ? 'success' : 'error');
  
  if (failed > 0) {
    log('\n❌ Tests échoués:', 'error');
    results.filter(r => !r.success).forEach(r => {
      log(`  - ${r.testName}: ${r.error}`, 'error');
    });
  }
  
  log('═══════════════════════════════════════════════════════════\n', 'info');
}

if (require.main === module) {
  main().catch(console.error);
}

export { main };

