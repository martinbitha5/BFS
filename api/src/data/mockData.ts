// Données de test pour le mode mock

export const mockPassengers = [
  {
    id: '1',
    full_name: 'Jean Kabongo',
    pnr: 'ABC123',
    flight_number: 'BF101',
    departure: 'FIH',
    arrival: 'GOM',
    seat_number: '12A',
    baggage_count: 2,
    checked_in_at: new Date().toISOString(),
    airport_code: 'FIH',
    baggages: [],
    boarding_status: [{ boarded: true, boarded_at: new Date().toISOString() }]
  },
  {
    id: '2',
    full_name: 'Marie Lumbu',
    pnr: 'DEF456',
    flight_number: 'BF102',
    departure: 'FIH',
    arrival: 'FBM',
    seat_number: '15C',
    baggage_count: 1,
    checked_in_at: new Date().toISOString(),
    airport_code: 'FIH',
    baggages: [],
    boarding_status: [{ boarded: false }]
  },
  {
    id: '3',
    full_name: 'Paul Mukendi',
    pnr: 'GHI789',
    flight_number: 'BF103',
    departure: 'GOM',
    arrival: 'FIH',
    seat_number: '8B',
    baggage_count: 2,
    checked_in_at: new Date().toISOString(),
    airport_code: 'GOM',
    baggages: [],
    boarding_status: [{ boarded: true, boarded_at: new Date().toISOString() }]
  },
  {
    id: '4',
    full_name: 'Sarah Tshombe',
    pnr: 'JKL012',
    flight_number: 'BF104',
    departure: 'FBM',
    arrival: 'FIH',
    seat_number: '22D',
    baggage_count: 3,
    checked_in_at: new Date().toISOString(),
    airport_code: 'FBM',
    baggages: [],
    boarding_status: [{ boarded: false }]
  },
];

export const mockBaggages = [
  {
    id: '1',
    tag_number: 'FIH001234',
    passenger_id: '1',
    weight: 23.5,
    status: 'checked',
    flight_number: 'BF101',
    checked_at: new Date().toISOString(),
    arrived_at: null,
    airport_code: 'FIH'
  },
  {
    id: '2',
    tag_number: 'FIH001235',
    passenger_id: '1',
    weight: 18.2,
    status: 'arrived',
    flight_number: 'BF101',
    checked_at: new Date().toISOString(),
    arrived_at: new Date().toISOString(),
    airport_code: 'FIH'
  },
  {
    id: '3',
    tag_number: 'FIH001236',
    passenger_id: '2',
    weight: 20.0,
    status: 'rush',
    flight_number: 'BF102',
    checked_at: new Date().toISOString(),
    arrived_at: null,
    airport_code: 'FIH',
    rush_reason: 'Soute pleine'
  },
  {
    id: '4',
    tag_number: 'GOM001234',
    passenger_id: '3',
    weight: 22.5,
    status: 'checked',
    flight_number: 'BF103',
    checked_at: new Date().toISOString(),
    arrived_at: null,
    airport_code: 'GOM'
  },
];

export const mockInternationalBaggages = [
  {
    id: '1',
    iata_bag_tag: 'ET1234567890',
    passenger_name: 'John Doe',
    flight_number: 'ET308',
    origin: 'ADD',
    destination: 'FIH',
    status: 'scanned',
    scanned_at: new Date().toISOString(),
    airport_code: 'FIH'
  },
  {
    id: '2',
    iata_bag_tag: 'TK9876543210',
    passenger_name: 'Jane Smith',
    flight_number: 'TK729',
    origin: 'IST',
    destination: 'FIH',
    status: 'rush',
    scanned_at: new Date().toISOString(),
    airport_code: 'FIH',
    rush_reason: 'Correspondance urgente'
  },
];

export const mockFlights = [
  {
    id: '1',
    flight_number: 'BF101',
    departure: 'FIH',
    arrival: 'GOM',
    departure_time: new Date().toISOString(),
    arrival_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    status: 'on_time'
  },
  {
    id: '2',
    flight_number: 'BF102',
    departure: 'FIH',
    arrival: 'FBM',
    departure_time: new Date().toISOString(),
    arrival_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    status: 'on_time'
  },
  {
    id: '3',
    flight_number: 'BF103',
    departure: 'GOM',
    arrival: 'FIH',
    departure_time: new Date().toISOString(),
    arrival_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    status: 'boarding'
  },
];

export function getMockStats(airport: string) {
  const airportPassengers = mockPassengers.filter(p => p.airport_code === airport);
  const airportBaggages = mockBaggages.filter(b => b.airport_code === airport);
  
  return {
    totalPassengers: airportPassengers.length,
    totalBaggages: airportBaggages.length,
    boardedPassengers: airportPassengers.filter(p => p.boarding_status?.[0]?.boarded).length,
    notBoardedPassengers: airportPassengers.filter(p => !p.boarding_status?.[0]?.boarded).length,
    arrivedBaggages: airportBaggages.filter(b => b.status === 'arrived').length,
    inTransitBaggages: airportBaggages.filter(b => b.status === 'checked').length,
    todayPassengers: airportPassengers.length,
    todayBaggages: airportBaggages.length,
    flightsCount: mockFlights.filter(f => f.departure === airport || f.arrival === airport).length,
    uniqueFlights: [...new Set(airportPassengers.map(p => p.flight_number))]
  };
}
