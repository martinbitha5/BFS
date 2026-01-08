import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  airportCode?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  userAirportCode?: string;
}
