export type UserRole = 'checkin' | 'baggage' | 'boarding' | 'arrival' | 'supervisor' | 'baggage_dispute' | 'support';

export interface User {
  id: string;
  email: string;
  fullName: string;
  airportCode: string;
  role: UserRole;
  isApproved?: boolean;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSession {
  user: User;
  accessToken: string;
  refreshToken?: string;
}

