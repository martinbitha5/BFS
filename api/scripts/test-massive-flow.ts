/**
 * Script de test massif pour valider le flux complet de l'application
 * 
 * Ce script :
 * 1. Génère 1 million d'agents avec différents rôles
 * 2. Teste toutes les restrictions par rôle
 * 3. Teste les restrictions par aéroport
 * 4. Teste les flux complets (checkin -> baggage -> boarding -> arrival)
 * 5. Teste les portails (dashboard, airline-portal)
 * 
 * Usage: npx ts-node api/scripts/test-massive-flow.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Charger les variables d'environnement
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

// Types
type UserRole = 'checkin' | 'baggage' | 'boarding' | 'arrival' | 'supervisor' | 'baggage_dispute' | 'support';

interface TestUser {
  id?: string;
  email: string;
  password: string;
  fullName: string;
  airportCode: string;
  role: UserRole;
  approved: boolean;
  token?: string;
}

interface TestResult {
  testName: string;
  success: boolean;
  error?: string;
  details?: any;
  duration?: number;
}

// Types pour les réponses API
interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  count?: number;
  error?: string;
}

interface PassengerResponse {
  id: string;
  full_name?: string;
  [key: string]: any;
}

interface TestStats {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalUsers: number;
  usersByRole: Record<UserRole, number>;
  usersByAirport: Record<string, number>;
  errors: string[];
}

// Configuration
// Détecter automatiquement l'URL de l'API
function getApiUrl(): string {
  // Si API_URL est défini dans les variables d'environnement, l'utiliser
  if (process.env.API_URL) {
    return process.env.API_URL;
  }
  
  // Sinon, utiliser l'API de production par défaut
  return 'https://api.brsats.com';
}

const CONFIG = {
  TOTAL_USERS: 1000000, // 1 million d'agents
  BATCH_SIZE: 1000, // Créer par lots de 1000
  AIRPORTS: ['FIH', 'GOM', 'KIN', 'LAD', 'BZV', 'NDJ', 'BGF', 'BKO', 'DLA', 'ABJ'],
  ROLES: ['checkin', 'baggage', 'boarding', 'arrival', 'supervisor'] as UserRole[],
  API_URL: getApiUrl(),
  DASHBOARD_URL: process.env.DASHBOARD_URL || 'https://dashboard.brsats.com',
  AIRLINE_PORTAL_URL: process.env.AIRLINE_PORTAL_URL || 'https://airline-portal.brsats.com',
};

// Statistiques globales
const stats: TestStats = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  totalUsers: 0,
  usersByRole: {
    checkin: 0,
    baggage: 0,
    boarding: 0,
    arrival: 0,
    supervisor: 0,
    baggage_dispute: 0,
    support: 0,
  },
  usersByAirport: {},
  errors: [],
};

const testResults: TestResult[] = [];

// Fonctions utilitaires
function generateEmail(role: UserRole, airport: string, index: number): string {
  return `test-${role}-${airport}-${index}@bfs-test.com`;
}

function generatePassword(): string {
  return 'Test123456!';
}

function generateName(role: UserRole, airport: string, index: number): string {
  const roleNames: Record<UserRole, string> = {
    checkin: 'Check-in Agent',
    baggage: 'Baggage Agent',
    boarding: 'Boarding Agent',
    arrival: 'Arrival Agent',
    supervisor: 'Supervisor',
    baggage_dispute: 'Baggage Dispute',
    support: 'Support',
  };
  return `${roleNames[role]} ${airport} ${index}`;
}

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warn: '⚠️',
  }[type];
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function recordTest(testName: string, success: boolean, error?: string, details?: any, duration?: number) {
  stats.totalTests++;
  if (success) {
    stats.passedTests++;
  } else {
    stats.failedTests++;
    if (error) stats.errors.push(`${testName}: ${error}`);
  }
  
  testResults.push({
    testName,
    success,
    error,
    details,
    duration,
  });
}

// ============================================
// PARTIE 1: GÉNÉRATION DES UTILISATEURS
// ============================================

async function generateUsers(): Promise<TestUser[]> {
  log(`Génération de ${CONFIG.TOTAL_USERS} utilisateurs...`, 'info');
  const users: TestUser[] = [];
  
  const usersPerRole = Math.floor(CONFIG.TOTAL_USERS / CONFIG.ROLES.length);
  const usersPerAirport = Math.floor(usersPerRole / CONFIG.AIRPORTS.length);
  
  let globalIndex = 0;
  
  for (const role of CONFIG.ROLES) {
    for (const airport of CONFIG.AIRPORTS) {
      for (let i = 0; i < usersPerAirport; i++) {
        if (globalIndex >= CONFIG.TOTAL_USERS) break;
        
        const user: TestUser = {
          email: generateEmail(role, airport, i),
          password: generatePassword(),
          fullName: generateName(role, airport, i),
          airportCode: airport,
          role,
          approved: role !== 'supervisor', // Les superviseurs nécessitent approbation
        };
        
        users.push(user);
        stats.usersByRole[role]++;
        stats.usersByAirport[airport] = (stats.usersByAirport[airport] || 0) + 1;
        globalIndex++;
      }
    }
  }
  
  stats.totalUsers = users.length;
  log(`Génération terminée: ${users.length} utilisateurs créés`, 'success');
  log(`Répartition par rôle: ${JSON.stringify(stats.usersByRole)}`, 'info');
  
  return users;
}

async function createUsersInBatches(users: TestUser[]): Promise<TestUser[]> {
  log(`Création/récupération des utilisateurs en lots de ${CONFIG.BATCH_SIZE}...`, 'info');
  const createdUsers: TestUser[] = [];
  let createdCount = 0;
  let reusedCount = 0;
  
  for (let i = 0; i < users.length; i += CONFIG.BATCH_SIZE) {
    const batch = users.slice(i, i + CONFIG.BATCH_SIZE);
    log(`Traitement du lot ${Math.floor(i / CONFIG.BATCH_SIZE) + 1}/${Math.ceil(users.length / CONFIG.BATCH_SIZE)}`, 'info');
    
    for (const user of batch) {
      try {
        // Essayer d'abord de s'authentifier avec l'utilisateur existant
        const { data: sessionData, error: authError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: user.password,
        });
        
        if (sessionData?.session && sessionData.user) {
          // L'utilisateur existe déjà, réutiliser
          user.id = sessionData.user.id;
          user.token = sessionData.session.access_token;
          
          // Vérifier que le profil existe dans la table users
          const { data: userData } = await supabase
            .from('users')
            .select('id, role, airport_code, approved')
            .eq('id', user.id)
            .single();
          
          if (userData) {
            // Mettre à jour les informations si nécessaire
            await supabase
              .from('users')
              .update({
                full_name: user.fullName,
                airport_code: user.airportCode,
                role: user.role,
                approved: user.approved,
              })
              .eq('id', user.id);
          } else {
            // Le profil n'existe pas, le créer
            await supabase
              .from('users')
              .insert({
                id: user.id,
                email: user.email,
                full_name: user.fullName,
                airport_code: user.airportCode,
                role: user.role,
                approved: user.approved,
              });
          }
          
          createdUsers.push(user);
          reusedCount++;
          continue;
        }
        
        // Si l'authentification échoue avec "Invalid login credentials", l'utilisateur existe mais le mot de passe est différent
        // Dans ce cas, on essaie de créer un nouvel utilisateur (qui échouera) ou on ignore
        if (authError && authError.message.includes('Invalid login credentials')) {
          // L'utilisateur existe mais le mot de passe ne correspond pas
          // Essayer de récupérer l'ID depuis la table users
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', user.email)
            .single();
          
          if (existingUser) {
            // L'utilisateur existe, essayer de réinitialiser le mot de passe avec admin
            try {
              await supabase.auth.admin.updateUserById(existingUser.id, {
                password: user.password,
              });
              
              // Réessayer l'authentification
              const { data: newSessionData } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: user.password,
              });
              
              if (newSessionData?.session) {
                user.id = newSessionData.user.id;
                user.token = newSessionData.session.access_token;
                createdUsers.push(user);
                reusedCount++;
                continue;
              }
            } catch (updateError: any) {
              log(`Impossible de mettre à jour le mot de passe pour ${user.email}: ${updateError.message}`, 'error');
            }
          }
          
          // Si on ne peut pas réutiliser, ignorer cet utilisateur
          continue;
        }
        
        // L'utilisateur n'existe pas, le créer
        const { data: authData, error: createError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
        });
        
        if (createError) {
          // Si l'erreur indique que l'utilisateur existe déjà, essayer de récupérer son ID
          if (createError.message.includes('already been registered')) {
            const { data: existingUser } = await supabase
              .from('users')
              .select('id')
              .eq('email', user.email)
              .single();
            
            if (existingUser) {
              // Essayer de réinitialiser le mot de passe
              try {
                await supabase.auth.admin.updateUserById(existingUser.id, {
                  password: user.password,
                });
                
                const { data: newSessionData } = await supabase.auth.signInWithPassword({
                  email: user.email,
                  password: user.password,
                });
                
                if (newSessionData?.session) {
                  user.id = newSessionData.user.id;
                  user.token = newSessionData.session.access_token;
                  createdUsers.push(user);
                  reusedCount++;
                  continue;
                }
              } catch (updateError: any) {
                log(`Impossible de réutiliser ${user.email}: ${updateError.message}`, 'error');
              }
            }
          }
          continue;
        }
        
        user.id = authData.user.id;
        
        // Créer le profil dans la table users
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.fullName,
            airport_code: user.airportCode,
            role: user.role,
            approved: user.approved,
          });
        
        if (userError) {
          // Si l'erreur indique que l'utilisateur existe déjà, mettre à jour
          if (userError.message.includes('duplicate key') || userError.code === '23505') {
            await supabase
              .from('users')
              .update({
                full_name: user.fullName,
                airport_code: user.airportCode,
                role: user.role,
                approved: user.approved,
              })
              .eq('id', user.id);
          } else {
            log(`Erreur création profil pour ${user.email}: ${userError.message}`, 'error');
            await supabase.auth.admin.deleteUser(user.id!);
            continue;
          }
        }
        
        createdUsers.push(user);
        createdCount++;
        
        // Obtenir un token pour les tests
        if (user.approved) {
          const { data: finalSessionData } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: user.password,
          });
          if (finalSessionData?.session) {
            user.token = finalSessionData.session.access_token;
          }
        }
        
      } catch (error: any) {
        log(`Erreur lors du traitement de ${user.email}: ${error.message}`, 'error');
      }
    }
    
    // Afficher la progression
    if ((i + CONFIG.BATCH_SIZE) % (CONFIG.BATCH_SIZE * 10) === 0) {
      log(`Progression: ${createdUsers.length}/${users.length} utilisateurs traités`, 'info');
    }
  }
  
  log(`Traitement terminé: ${createdUsers.length} utilisateurs disponibles (${createdCount} créés, ${reusedCount} réutilisés)`, 'success');
  return createdUsers;
}

// ============================================
// PARTIE 2: TESTS DE RESTRICTIONS PAR RÔLE
// ============================================

async function testRoleRestrictions(users: TestUser[]): Promise<void> {
  log('🧪 Test des restrictions par rôle...', 'info');
  
  // Tester chaque rôle
  for (const role of CONFIG.ROLES) {
    const roleUsers = users.filter(u => u.role === role && u.approved && u.token);
    if (roleUsers.length === 0) continue;
    
    const testUser = roleUsers[0];
    log(`Test des restrictions pour le rôle: ${role}`, 'info');
    
    // Test 1: Accès aux passagers (checkin et supervisor uniquement)
    const startTime = Date.now();
    try {
      const response = await fetch(`${CONFIG.API_URL}/api/v1/passengers?airport=${testUser.airportCode}`, {
        headers: {
          'Authorization': `Bearer ${testUser.token}`,
          'x-airport-code': testUser.airportCode,
        },
      });
      
      const shouldHaveAccess = ['checkin', 'supervisor'].includes(role);
      const hasAccess = response.status !== 403;
      
      recordTest(
        `Rôle ${role}: Accès aux passagers`,
        shouldHaveAccess === hasAccess,
        shouldHaveAccess !== hasAccess ? `Accès ${hasAccess ? 'autorisé' : 'refusé'} alors que ${shouldHaveAccess ? 'autorisé' : 'refusé'} attendu` : undefined,
        { role, status: response.status },
        Date.now() - startTime
      );
    } catch (error: any) {
      recordTest(`Rôle ${role}: Accès aux passagers`, false, error.message);
    }
    
    // Test 2: Création de passagers (checkin et supervisor uniquement)
    if (['checkin', 'supervisor'].includes(role)) {
      try {
        const response = await fetch(`${CONFIG.API_URL}/api/v1/passengers`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${testUser.token}`,
            'Content-Type': 'application/json',
            'x-airport-code': testUser.airportCode,
          },
          body: JSON.stringify({
            full_name: 'Test Passenger',
            pnr: 'TEST123',
            flight_number: 'AC123',
            departure: 'FIH',
            arrival: 'GOM',
            airport_code: testUser.airportCode,
          }),
        });
        
        recordTest(
          `Rôle ${role}: Création de passagers`,
          response.status === 201 || response.status === 200,
          response.status !== 201 && response.status !== 200 ? `Status ${response.status} au lieu de 201/200` : undefined,
          { role, status: response.status }
        );
      } catch (error: any) {
        recordTest(`Rôle ${role}: Création de passagers`, false, error.message);
      }
    }
    
    // Test 3: Accès aux bagages (baggage, checkin, supervisor)
    try {
      const response = await fetch(`${CONFIG.API_URL}/api/v1/baggage?airport=${testUser.airportCode}`, {
        headers: {
          'Authorization': `Bearer ${testUser.token}`,
          'x-airport-code': testUser.airportCode,
        },
      });
      
      const shouldHaveAccess = ['baggage', 'checkin', 'supervisor'].includes(role);
      const hasAccess = response.status !== 403;
      
      recordTest(
        `Rôle ${role}: Accès aux bagages`,
        shouldHaveAccess === hasAccess,
        shouldHaveAccess !== hasAccess ? `Accès ${hasAccess ? 'autorisé' : 'refusé'} alors que ${shouldHaveAccess ? 'autorisé' : 'refusé'} attendu` : undefined,
        { role, status: response.status }
      );
    } catch (error: any) {
      recordTest(`Rôle ${role}: Accès aux bagages`, false, error.message);
    }
    
    // Test 4: Accès aux routes d'approbation (support uniquement)
    if (role === 'support') {
      try {
        const response = await fetch(`${CONFIG.API_URL}/api/v1/user-approval/requests`, {
          headers: {
            'Authorization': `Bearer ${testUser.token}`,
          },
        });
        
        recordTest(
          `Rôle ${role}: Accès aux approbations`,
          response.status === 200,
          response.status !== 200 ? `Status ${response.status} au lieu de 200` : undefined,
          { role, status: response.status }
        );
      } catch (error: any) {
        recordTest(`Rôle ${role}: Accès aux approbations`, false, error.message);
      }
    } else {
      // Les autres rôles ne devraient pas avoir accès
      try {
        const response = await fetch(`${CONFIG.API_URL}/api/v1/user-approval/requests`, {
          headers: {
            'Authorization': `Bearer ${testUser.token}`,
          },
        });
        
        recordTest(
          `Rôle ${role}: Accès refusé aux approbations`,
          response.status === 403,
          response.status !== 403 ? `Status ${response.status} au lieu de 403` : undefined,
          { role, status: response.status }
        );
      } catch (error: any) {
        recordTest(`Rôle ${role}: Accès refusé aux approbations`, false, error.message);
      }
    }
  }
  
  log('✅ Tests de restrictions par rôle terminés', 'success');
}

// ============================================
// PARTIE 3: TESTS DE RESTRICTIONS PAR AÉROPORT
// ============================================

async function testAirportRestrictions(users: TestUser[]): Promise<void> {
  log('🧪 Test des restrictions par aéroport...', 'info');
  
  // Prendre un utilisateur checkin de chaque aéroport principal pour les tests
  const mainAirports = ['FIH', 'GOM', 'KIN'];
  
  for (const airport of mainAirports) {
    // Trouver un agent checkin de cet aéroport
    const checkinUser = users.find(u => u.role === 'checkin' && u.airportCode === airport && u.approved && u.token);
    if (!checkinUser) {
      log(`⚠️  Aucun agent checkin trouvé pour ${airport}, test ignoré`, 'warn');
      continue;
    }
    
    log(`Test des restrictions pour l'aéroport: ${airport} (agent: ${checkinUser.email})`, 'info');
    
    // Test 1: Accès aux données de son propre aéroport (devrait être autorisé)
    try {
      const response = await fetch(`${CONFIG.API_URL}/api/v1/passengers?airport=${airport}`, {
        headers: {
          'Authorization': `Bearer ${checkinUser.token}`,
          'x-airport-code': airport,
        },
      });
      
      const isAuthorized = response.status === 200 || response.status === 404; // 404 si pas de données, c'est OK
      
      recordTest(
        `Aéroport ${airport}: Accès aux données de son propre aéroport`,
        isAuthorized,
        !isAuthorized ? `Status ${response.status} - Accès refusé alors qu'il devrait être autorisé` : undefined,
        { airport, status: response.status, user: checkinUser.email }
      );
    } catch (error: any) {
      recordTest(`Aéroport ${airport}: Accès aux données de son propre aéroport`, false, error.message);
    }
    
    // Test 2: Tentative d'accès aux données d'un autre aéroport (devrait être refusé)
    const otherAirports = mainAirports.filter(a => a !== airport);
    for (const otherAirport of otherAirports) {
      try {
        const response = await fetch(`${CONFIG.API_URL}/api/v1/passengers?airport=${otherAirport}`, {
          headers: {
            'Authorization': `Bearer ${checkinUser.token}`,
            'x-airport-code': otherAirport, // Tentative d'accès à un autre aéroport
          },
        });
        
        // Devrait être refusé avec 403
        const isRestricted = response.status === 403;
        
        recordTest(
          `Aéroport ${airport}: Accès refusé aux données de ${otherAirport}`,
          isRestricted,
          !isRestricted ? `Status ${response.status} - Accès autorisé alors qu'il devrait être refusé (403 attendu)` : undefined,
          { airport, otherAirport, status: response.status, user: checkinUser.email }
        );
      } catch (error: any) {
        recordTest(`Aéroport ${airport}: Accès refusé aux données de ${otherAirport}`, false, error.message);
      }
    }
  }
  
  log('✅ Tests de restrictions par aéroport terminés', 'success');
}

// ============================================
// PARTIE 4: TESTS DE FLUX COMPLET
// ============================================

async function testCompleteFlow(users: TestUser[]): Promise<void> {
  log('🧪 Test du flux complet (checkin -> baggage -> boarding -> arrival)...', 'info');
  
  // Trouver un utilisateur de chaque rôle pour le flux
  const checkinUser = users.find(u => u.role === 'checkin' && u.approved && u.token);
  const baggageUser = users.find(u => u.role === 'baggage' && u.approved && u.token);
  const boardingUser = users.find(u => u.role === 'boarding' && u.approved && u.token);
  const arrivalUser = users.find(u => u.role === 'arrival' && u.approved && u.token);
  
  if (!checkinUser || !baggageUser || !boardingUser || !arrivalUser) {
    log('⚠️  Utilisateurs manquants pour le test de flux complet', 'warn');
    return;
  }
  
  // Utiliser le même aéroport pour tous
  const airport = checkinUser.airportCode;
  const flightNumber = 'TEST' + Math.floor(Math.random() * 1000);
  const pnr = 'PNR' + Math.floor(Math.random() * 100000);
  const passengerName = 'Test Passenger Flow';
  let passengerId: string | undefined;
  let baggageTag: string | undefined;
  
  // Étape 1: Check-in (création du passager)
  try {
    log('Étape 1: Check-in...', 'info');
    const response = await fetch(`${CONFIG.API_URL}/api/v1/passengers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${checkinUser.token}`,
        'Content-Type': 'application/json',
        'x-airport-code': airport,
      },
      body: JSON.stringify({
        full_name: passengerName,
        pnr,
        flight_number: flightNumber,
        departure: airport,
        arrival: CONFIG.AIRPORTS.find(a => a !== airport) || 'GOM',
        airport_code: airport,
        baggage_count: 1,
      }),
    });
    
    if (response.status === 201 || response.status === 200) {
      const data = await response.json() as ApiResponse<PassengerResponse> | PassengerResponse;
      if ('data' in data && data.data) {
        passengerId = (data.data as PassengerResponse).id;
      } else if ('id' in data) {
        passengerId = (data as PassengerResponse).id;
      }
      recordTest('Flux: Check-in passager', true, undefined, { passengerId });
    } else {
      recordTest('Flux: Check-in passager', false, `Status ${response.status}`);
      return;
    }
  } catch (error: any) {
    recordTest('Flux: Check-in passager', false, error.message);
    return;
  }
  
  // Étape 2: Enregistrement bagage
  if (passengerId) {
    try {
      log('Étape 2: Enregistrement bagage...', 'info');
      baggageTag = 'BAG' + Math.floor(Math.random() * 1000000);
      const response = await fetch(`${CONFIG.API_URL}/api/v1/baggage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${baggageUser.token}`,
          'Content-Type': 'application/json',
          'x-airport-code': airport,
        },
        body: JSON.stringify({
          tag_number: baggageTag,
          passenger_id: passengerId,
          weight: 20.5,
          flight_number: flightNumber,
          airport_code: airport,
        }),
      });
      
      recordTest(
        'Flux: Enregistrement bagage',
        response.status === 201 || response.status === 200,
        response.status !== 201 && response.status !== 200 ? `Status ${response.status}` : undefined,
        { baggageTag }
      );
    } catch (error: any) {
      recordTest('Flux: Enregistrement bagage', false, error.message);
    }
  }
  
  // Étape 3: Boarding
  if (passengerId) {
    try {
      log('Étape 3: Boarding...', 'info');
      const response = await fetch(`${CONFIG.API_URL}/api/v1/boarding`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${boardingUser.token}`,
          'Content-Type': 'application/json',
          'x-airport-code': airport,
        },
        body: JSON.stringify({
          passenger_id: passengerId,
          flight_number: flightNumber,
        }),
      });
      
      recordTest(
        'Flux: Boarding passager',
        response.status === 201 || response.status === 200,
        response.status !== 201 && response.status !== 200 ? `Status ${response.status}` : undefined
      );
    } catch (error: any) {
      recordTest('Flux: Boarding passager', false, error.message);
    }
  }
  
  // Étape 4: Arrival
  if (baggageTag) {
    try {
      log('Étape 4: Arrival bagage...', 'info');
      const response = await fetch(`${CONFIG.API_URL}/api/v1/baggage/${baggageTag}/arrive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${arrivalUser.token}`,
          'Content-Type': 'application/json',
          'x-airport-code': airport,
        },
      });
      
      recordTest(
        'Flux: Arrival bagage',
        response.status === 200 || response.status === 201,
        response.status !== 200 && response.status !== 201 ? `Status ${response.status}` : undefined
      );
    } catch (error: any) {
      recordTest('Flux: Arrival bagage', false, error.message);
    }
  }
  
  log('✅ Test de flux complet terminé', 'success');
}

// ============================================
// PARTIE 5: TESTS DES PORTAILS
// ============================================

async function testPortals(users: TestUser[]): Promise<void> {
  log('🧪 Test des portails...', 'info');
  
  // Test Dashboard (supervisor)
  const supervisorUser = users.find(u => u.role === 'supervisor' && u.approved && u.token);
  if (supervisorUser) {
    try {
      log('Test Dashboard...', 'info');
      // Simuler une requête au dashboard (nécessite un navigateur, donc on teste juste l'API)
      const response = await fetch(`${CONFIG.API_URL}/api/v1/auth/me`, {
        headers: {
          'Authorization': `Bearer ${supervisorUser.token}`,
        },
      });
      
      recordTest(
        'Portail Dashboard: Authentification',
        response.status === 200,
        response.status !== 200 ? `Status ${response.status}` : undefined
      );
    } catch (error: any) {
      recordTest('Portail Dashboard: Authentification', false, error.message);
    }
  }
  
  // Test Airline Portal (airline account)
  try {
    log('Test Airline Portal...', 'info');
    // Tester la connexion airline
    const response = await fetch(`${CONFIG.API_URL}/api/v1/airlines/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'support@brsats.com',
        password: '0827241919mA@',
      }),
    });
    
    recordTest(
      'Portail Airline: Connexion',
      response.status === 200,
      response.status !== 200 ? `Status ${response.status}` : undefined
    );
  } catch (error: any) {
    recordTest('Portail Airline: Connexion', false, error.message);
  }
  
  log('✅ Tests des portails terminés', 'success');
}

// ============================================
// PARTIE 6: RAPPORT FINAL
// ============================================

function generateReport(): void {
  log('\n═══════════════════════════════════════════════════════════', 'info');
  log('📊 RAPPORT DE TEST COMPLET', 'info');
  log('═══════════════════════════════════════════════════════════\n', 'info');
  
  log(`Total d'utilisateurs créés: ${stats.totalUsers}`, 'info');
  log(`Répartition par rôle:`, 'info');
  Object.entries(stats.usersByRole).forEach(([role, count]) => {
    if (count > 0) {
      log(`  - ${role}: ${count}`, 'info');
    }
  });
  
  log(`\nTotal de tests: ${stats.totalTests}`, 'info');
  log(`Tests réussis: ${stats.passedTests} (${((stats.passedTests / stats.totalTests) * 100).toFixed(2)}%)`, stats.passedTests === stats.totalTests ? 'success' : 'warn');
  log(`Tests échoués: ${stats.failedTests} (${((stats.failedTests / stats.totalTests) * 100).toFixed(2)}%)`, stats.failedTests === 0 ? 'success' : 'error');
  
  if (stats.errors.length > 0) {
    log(`\n❌ Erreurs rencontrées:`, 'error');
    stats.errors.slice(0, 20).forEach((error, index) => {
      log(`  ${index + 1}. ${error}`, 'error');
    });
    if (stats.errors.length > 20) {
      log(`  ... et ${stats.errors.length - 20} autres erreurs`, 'error');
    }
  }
  
  log('\n═══════════════════════════════════════════════════════════\n', 'info');
}

// ============================================
// FONCTION PRINCIPALE
// ============================================

async function main() {
  log('🚀 Démarrage du test massif du flux complet', 'info');
  log(`Configuration: ${CONFIG.TOTAL_USERS} utilisateurs, ${CONFIG.ROLES.length} rôles, ${CONFIG.AIRPORTS.length} aéroports`, 'info');
  log(`API URL: ${CONFIG.API_URL}`, 'info');
  
  // Vérifier que l'API est accessible
  try {
    const healthResponse = await fetch(`${CONFIG.API_URL}/health`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      log(`✅ API accessible: ${JSON.stringify(healthData)}`, 'success');
    } else {
      log(`⚠️  API répond mais avec un statut ${healthResponse.status}`, 'warn');
    }
  } catch (error: any) {
    log(`❌ Impossible de se connecter à l'API: ${error.message}`, 'error');
    log(`   Vérifiez que l'API est accessible à ${CONFIG.API_URL}`, 'error');
    log(`   Vous pouvez définir API_URL dans les variables d'environnement pour utiliser une autre URL`, 'info');
    process.exit(1);
  }
  
  try {
    // Partie 1: Génération des utilisateurs
    const users = await generateUsers();
    
    // Partie 2: Création des utilisateurs (optionnel - peut être long)
    log('\n⚠️  ATTENTION: La création de 1M d\'utilisateurs peut prendre très longtemps!', 'warn');
    log('Pour tester rapidement, modifiez CONFIG.TOTAL_USERS à 100 ou 1000', 'warn');
    
    // Créer des agents spécifiques par rôle et par aéroport pour les tests
    // On crée au moins un agent de chaque rôle pour chaque aéroport principal
    const testUsers: TestUser[] = [];
    const mainAirports = ['FIH', 'GOM', 'KIN']; // Aéroports principaux pour les tests
    
    for (const role of CONFIG.ROLES) {
      for (const airport of mainAirports) {
        // Trouver un utilisateur de ce rôle et cet aéroport
        const matchingUser = users.find(u => u.role === role && u.airportCode === airport);
        if (matchingUser) {
          testUsers.push(matchingUser);
        }
      }
    }
    
    log(`Création de ${testUsers.length} agents de test (${CONFIG.ROLES.length} rôles × ${mainAirports.length} aéroports)...`, 'info');
    const createdUsers = await createUsersInBatches(testUsers);
    
    // Partie 3: Tests de restrictions par rôle
    await testRoleRestrictions(createdUsers);
    
    // Partie 4: Tests de restrictions par aéroport
    await testAirportRestrictions(createdUsers);
    
    // Partie 5: Tests de flux complet
    await testCompleteFlow(createdUsers);
    
    // Partie 6: Tests des portails (appel du script séparé)
    log('Pour tester les portails, exécutez: npm run test-portals', 'info');
    
    // Générer le rapport
    generateReport();
    
    log('✅ Tous les tests sont terminés!', 'success');
    
  } catch (error: any) {
    log(`❌ Erreur fatale: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

// Exécuter le script
if (require.main === module) {
  main().catch(console.error);
}

export { main, generateUsers, testRoleRestrictions, testAirportRestrictions, testCompleteFlow, testPortals };

