export const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS passengers (
  id TEXT PRIMARY KEY,
  pnr TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  flight_number TEXT NOT NULL,
  flight_time TEXT,
  airline TEXT,
  airline_code TEXT,
  departure TEXT NOT NULL,
  arrival TEXT NOT NULL,
  route TEXT NOT NULL,
  company_code TEXT,
  ticket_number TEXT,
  seat_number TEXT,
  cabin_class TEXT,
  baggage_count INTEGER DEFAULT 0,
  baggage_base_number TEXT,
  raw_data TEXT,
  format TEXT,
  checked_in_at TEXT NOT NULL,
  checked_in_by TEXT NOT NULL,
  synced INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS baggages (
  id TEXT PRIMARY KEY,
  passenger_id TEXT NOT NULL,
  rfid_tag TEXT UNIQUE NOT NULL,
  expected_tag TEXT,
  status TEXT NOT NULL DEFAULT 'checked',
  checked_at TEXT,
  checked_by TEXT,
  arrived_at TEXT,
  arrived_by TEXT,
  synced INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (passenger_id) REFERENCES passengers(id)
);

CREATE TABLE IF NOT EXISTS boarding_status (
  id TEXT PRIMARY KEY,
  passenger_id TEXT UNIQUE NOT NULL,
  boarded INTEGER DEFAULT 0,
  boarded_at TEXT,
  boarded_by TEXT,
  synced INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (passenger_id) REFERENCES passengers(id)
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  data TEXT NOT NULL,
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  airport_code TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_passengers_pnr ON passengers(pnr);
CREATE INDEX IF NOT EXISTS idx_passengers_departure ON passengers(departure);
CREATE INDEX IF NOT EXISTS idx_passengers_arrival ON passengers(arrival);
CREATE INDEX IF NOT EXISTS idx_baggages_passenger_id ON baggages(passenger_id);
CREATE INDEX IF NOT EXISTS idx_baggages_rfid_tag ON baggages(rfid_tag);
CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(retry_count);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_airport_code ON audit_log(airport_code);
`;

