// Superviseurs mockés pour les tests
// Chaque superviseur est assigné à UN SEUL aéroport

export interface Supervisor {
  id: string;
  email: string;
  password: string; // En production, ce sera hashé
  name: string;
  airportCode: string;
  role: 'supervisor' | 'admin';
  createdAt: string;
}

export const mockSupervisors: Supervisor[] = [
  {
    id: '1',
    email: 'kinshasa@bfs.cd',
    password: 'test123', // Mot de passe simple pour les tests
    name: 'Jean Kabila',
    airportCode: 'FIH',
    role: 'supervisor',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    email: 'goma@bfs.cd',
    password: 'test123',
    name: 'Marie Mukendi',
    airportCode: 'GOM',
    role: 'supervisor',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    email: 'lubumbashi@bfs.cd',
    password: 'test123',
    name: 'Paul Tshisekedi',
    airportCode: 'FBM',
    role: 'supervisor',
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    email: 'admin@bfs.cd',
    password: 'admin123',
    name: 'Administrateur Système',
    airportCode: 'FIH', // Admin principal à Kinshasa
    role: 'admin',
    createdAt: new Date().toISOString(),
  },
];

/**
 * Trouver un superviseur par email
 */
export function findSupervisorByEmail(email: string): Supervisor | undefined {
  return mockSupervisors.find(s => s.email.toLowerCase() === email.toLowerCase());
}

/**
 * Valider les credentials d'un superviseur
 */
export function validateSupervisor(email: string, password: string): Supervisor | null {
  const supervisor = findSupervisorByEmail(email);
  if (!supervisor) return null;
  
  // En production, on comparerait avec bcrypt
  if (supervisor.password !== password) return null;
  
  return supervisor;
}

/**
 * Obtenir un superviseur par ID
 */
export function getSupervisorById(id: string): Supervisor | undefined {
  return mockSupervisors.find(s => s.id === id);
}
