export type UserRole = 'checkin' | 'baggage' | 'boarding' | 'arrival' | 'supervisor';

export interface User {
  id: string;
  email: string;
  fullName: string;
  airportCode: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface UserSession {
  user: User;
  accessToken: string;
  refreshToken?: string;
}

