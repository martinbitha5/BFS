import { User } from '../types/user.types';

export function getApiHeaders(user: User | null, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey || '',
    'x-airport-code': user?.airportCode || '',
  };
  if (user?.airlineCode) {
    headers['x-airline-code'] = user.airlineCode;
  }
  return headers;
}
