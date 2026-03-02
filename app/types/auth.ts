export interface User {
  id: string;
  email?: string;
  username?: string;
  fullName?: string;
  airport_code?: string;
  airportCode?: string;
  airline_code?: string;
  airlineCode?: string;
  role: string;
  [key: string]: unknown;
}
