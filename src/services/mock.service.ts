import { User, UserRole } from '../types/user.types';
import { Passenger } from '../types/passenger.types';
import { Baggage } from '../types/baggage.types';
import { BoardingStatus } from '../types/boarding.types';

/**
 * Service mock pour simuler les données avant la configuration Supabase
 * Toutes les données sont stockées en mémoire
 */

// Données mockées des utilisateurs
const MOCK_USERS: User[] = [
  {
    id: 'user1',
    email: 'checkin@bfs.com',
    fullName: 'Jean Dupont',
    airportCode: 'FIH',
    role: 'checkin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'user2',
    email: 'baggage@bfs.com',
    fullName: 'Marie Martin',
    airportCode: 'FIH',
    role: 'baggage',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'user3',
    email: 'boarding@bfs.com',
    fullName: 'Pierre Durand',
    airportCode: 'FIH',
    role: 'boarding',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'user4',
    email: 'arrival@bfs.com',
    fullName: 'Sophie Bernard',
    airportCode: 'FIH',
    role: 'arrival',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'user5',
    email: 'supervisor@bfs.com',
    fullName: 'Admin Supervisor',
    airportCode: 'FIH',
    role: 'supervisor',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Données mockées des passagers
let MOCK_PASSENGERS: Passenger[] = [
  {
    id: 'passenger1',
    pnr: 'GPRJDV',
    fullName: 'KATEBA MULONGO',
    lastName: 'MULONGO',
    firstName: 'KATEBA',
    flightNumber: '9U123',
    flightTime: '14:30',
    airline: 'Air Congo',
    airlineCode: '9U',
    departure: 'FIH',
    arrival: 'JNB',
    route: 'FIH-JNB',
    companyCode: '9U',
    ticketNumber: '1234567890',
    seatNumber: '12A',
    cabinClass: 'Y',
    baggageCount: 2,
    baggageBaseNumber: '4071161863',
    rawData: 'M1KATEBA9U123FIHJNB143012A4071161863002',
    format: 'AIR_CONGO',
    checkedInAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    checkedInBy: 'user1',
    synced: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'passenger2',
    pnr: 'YFMKNE',
    fullName: 'MUKAMBA TSHILOMBO',
    lastName: 'TSHILOMBO',
    firstName: 'MUKAMBA',
    flightNumber: '9U456',
    flightTime: '16:00',
    airline: 'Air Congo',
    airlineCode: '9U',
    departure: 'FIH',
    arrival: 'LAD',
    route: 'FIH-LAD',
    companyCode: '9U',
    ticketNumber: '0987654321',
    seatNumber: '8B',
    cabinClass: 'Y',
    baggageCount: 1,
    baggageBaseNumber: '4071161870',
    rawData: 'M1MUKAMBA9U456FIHLAD160008B4071161870001',
    format: 'AIR_CONGO',
    checkedInAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    checkedInBy: 'user1',
    synced: false,
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
];

// Données mockées des bagages
let MOCK_BAGGAGES: Baggage[] = [
  {
    id: 'baggage1',
    passengerId: 'passenger1',
    rfidTag: '4071161863',
    expectedTag: '4071161863',
    status: 'checked',
    checkedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    checkedBy: 'user2',
    synced: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'baggage2',
    passengerId: 'passenger1',
    rfidTag: '4071161864',
    expectedTag: '4071161864',
    status: 'checked',
    checkedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    checkedBy: 'user2',
    synced: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

// Données mockées des statuts d'embarquement
let MOCK_BOARDING_STATUS: BoardingStatus[] = [];

class MockService {
  // Simuler un délai réseau
  private delay(ms: number = 500): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Authentification mockée
  async login(email: string, password: string): Promise<User> {
    await this.delay(800);
    
    const user = MOCK_USERS.find((u) => u.email === email);
    if (!user) {
      throw new Error('Email ou mot de passe incorrect');
    }

    // Mot de passe mocké : "password123" pour tous les utilisateurs
    if (password !== 'password123') {
      throw new Error('Email ou mot de passe incorrect');
    }

    return user;
  }

  async register(
    email: string,
    password: string,
    fullName: string,
    airportCode: string,
    role: UserRole
  ): Promise<User> {
    await this.delay(1000);

    // Vérifier si l'email existe déjà
    if (MOCK_USERS.some((u) => u.email === email)) {
      throw new Error('Cet email est déjà utilisé');
    }

    const newUser: User = {
      id: `user${MOCK_USERS.length + 1}`,
      email,
      fullName,
      airportCode,
      role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    MOCK_USERS.push(newUser);
    return newUser;
  }

  // Passagers
  async getPassengerByPnr(pnr: string): Promise<Passenger | null> {
    await this.delay(300);
    return MOCK_PASSENGERS.find((p) => p.pnr === pnr.toUpperCase()) || null;
  }

  async getPassengerById(id: string): Promise<Passenger | null> {
    await this.delay(300);
    return MOCK_PASSENGERS.find((p) => p.id === id) || null;
  }

  async getPassengersByAirport(airportCode: string): Promise<Passenger[]> {
    await this.delay(500);
    return MOCK_PASSENGERS.filter(
      (p) => p.departure === airportCode || p.arrival === airportCode
    );
  }

  async createPassenger(passenger: Omit<Passenger, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    await this.delay(600);
    
    const id = `passenger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const newPassenger: Passenger = {
      ...passenger,
      id,
      createdAt: now,
      updatedAt: now,
    };

    MOCK_PASSENGERS.push(newPassenger);
    return id;
  }

  // Bagages
  async getBaggageByRfidTag(rfidTag: string): Promise<Baggage | null> {
    await this.delay(300);
    return MOCK_BAGGAGES.find((b) => b.rfidTag === rfidTag) || null;
  }

  async getBaggagesByPassengerId(passengerId: string): Promise<Baggage[]> {
    await this.delay(300);
    return MOCK_BAGGAGES.filter((b) => b.passengerId === passengerId);
  }

  async getBaggagesByPassengerIds(passengerIds: string[]): Promise<Baggage[]> {
    await this.delay(300);
    return MOCK_BAGGAGES.filter((b) => passengerIds.includes(b.passengerId));
  }

  async getBaggagesByAirport(airportCode: string): Promise<Baggage[]> {
    await this.delay(300);
    const airportPassengers = MOCK_PASSENGERS.filter(
      (p) => p.departure === airportCode || p.arrival === airportCode
    );
    const passengerIds = airportPassengers.map((p) => p.id);
    return MOCK_BAGGAGES.filter((b) => passengerIds.includes(b.passengerId));
  }

  async createBaggage(baggage: Omit<Baggage, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    await this.delay(500);
    
    const id = `baggage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const newBaggage: Baggage = {
      ...baggage,
      id,
      createdAt: now,
      updatedAt: now,
    };

    MOCK_BAGGAGES.push(newBaggage);
    return id;
  }

  async updateBaggageStatus(
    baggageId: string,
    status: 'checked' | 'arrived' | 'rush',
    userId: string
  ): Promise<void> {
    await this.delay(400);

    const baggage = MOCK_BAGGAGES.find((b) => b.id === baggageId);
    if (baggage) {
      baggage.status = status;
      baggage.updatedAt = new Date().toISOString();
      if (status === 'arrived') {
        baggage.arrivedAt = new Date().toISOString();
        baggage.arrivedBy = userId;
      } else if (status === 'checked') {
        baggage.checkedAt = new Date().toISOString();
        baggage.checkedBy = userId;
      } else if (status === 'rush') {
        // Rush: soute pleine, pas besoin de mettre à jour d'autres champs
      }
    }
  }

  // Boarding Status
  async getBoardingStatusByPassengerId(passengerId: string): Promise<BoardingStatus | null> {
    await this.delay(300);
    return MOCK_BOARDING_STATUS.find((b) => b.passengerId === passengerId) || null;
  }

  async getBoardingStatusesByPassengerIds(passengerIds: string[]): Promise<BoardingStatus[]> {
    await this.delay(300);
    return MOCK_BOARDING_STATUS.filter((b) => passengerIds.includes(b.passengerId));
  }

  async getBoardingStatusesByAirport(airportCode: string): Promise<BoardingStatus[]> {
    await this.delay(300);
    const airportPassengers = MOCK_PASSENGERS.filter(
      (p) => p.departure === airportCode || p.arrival === airportCode
    );
    const passengerIds = airportPassengers.map((p) => p.id);
    return MOCK_BOARDING_STATUS.filter((b) => passengerIds.includes(b.passengerId));
  }

  async createOrUpdateBoardingStatus(
    status: Omit<BoardingStatus, 'id' | 'createdAt'>
  ): Promise<string> {
    await this.delay(500);
    
    const existing = MOCK_BOARDING_STATUS.find((b) => b.passengerId === status.passengerId);
    
    if (existing) {
      existing.boarded = status.boarded;
      existing.boardedAt = status.boardedAt;
      existing.boardedBy = status.boardedBy;
      existing.synced = status.synced;
      return existing.id;
    } else {
      const id = `boarding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      
      const newStatus: BoardingStatus = {
        ...status,
        id,
        createdAt: now,
      };

      MOCK_BOARDING_STATUS.push(newStatus);
      return id;
    }
  }

  // Méthodes utilitaires pour réinitialiser les données
  resetData() {
    MOCK_PASSENGERS = [];
    MOCK_BAGGAGES = [];
    MOCK_BOARDING_STATUS = [];
  }

  // Obtenir toutes les données (pour debug)
  getAllData() {
    return {
      passengers: MOCK_PASSENGERS,
      baggages: MOCK_BAGGAGES,
      boardingStatus: MOCK_BOARDING_STATUS,
      users: MOCK_USERS,
    };
  }
}

export const mockService = new MockService();

