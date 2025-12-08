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

CREATE TABLE IF NOT EXISTS raw_scans (
  id TEXT PRIMARY KEY,
  raw_data TEXT NOT NULL,
  scan_type TEXT NOT NULL,
  status_checkin INTEGER DEFAULT 0,
  status_baggage INTEGER DEFAULT 0,
  status_boarding INTEGER DEFAULT 0,
  status_arrival INTEGER DEFAULT 0,
  checkin_at TEXT,
  checkin_by TEXT,
  baggage_at TEXT,
  baggage_by TEXT,
  baggage_rfid_tag TEXT,
  boarding_at TEXT,
  boarding_by TEXT,
  arrival_at TEXT,
  arrival_by TEXT,
  airport_code TEXT NOT NULL,
  first_scanned_at TEXT NOT NULL,
  last_scanned_at TEXT NOT NULL,
  scan_count INTEGER DEFAULT 1,
  synced INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_raw_scans_raw_data ON raw_scans(raw_data);
CREATE INDEX IF NOT EXISTS idx_raw_scans_airport ON raw_scans(airport_code);
CREATE INDEX IF NOT EXISTS idx_raw_scans_statuses ON raw_scans(status_checkin, status_baggage, status_boarding, status_arrival);
CREATE INDEX IF NOT EXISTS idx_raw_scans_rfid ON raw_scans(baggage_rfid_tag);
CREATE INDEX IF NOT EXISTS idx_raw_scans_scan_type ON raw_scans(scan_type);

CREATE TABLE IF NOT EXISTS international_baggages (
  id TEXT PRIMARY KEY,
  rfid_tag TEXT UNIQUE NOT NULL,
  scanned_at TEXT NOT NULL,
  scanned_by TEXT NOT NULL,
  airport_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scanned',
  birs_report_id TEXT,
  passenger_name TEXT,
  pnr TEXT,
  flight_number TEXT,
  origin TEXT,
  weight REAL,
  remarks TEXT,
  reconciled_at TEXT,
  reconciled_by TEXT,
  synced INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS birs_reports (
  id TEXT PRIMARY KEY,
  report_type TEXT NOT NULL,
  flight_number TEXT NOT NULL,
  flight_date TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  airline TEXT NOT NULL,
  airline_code TEXT,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_at TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  airport_code TEXT NOT NULL,
  total_baggages INTEGER DEFAULT 0,
  reconciled_count INTEGER DEFAULT 0,
  unmatched_count INTEGER DEFAULT 0,
  processed_at TEXT,
  raw_data TEXT NOT NULL,
  synced INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS birs_report_items (
  id TEXT PRIMARY KEY,
  birs_report_id TEXT NOT NULL,
  bag_id TEXT NOT NULL,
  passenger_name TEXT NOT NULL,
  pnr TEXT,
  seat_number TEXT,
  class TEXT,
  psn TEXT,
  weight REAL,
  route TEXT,
  categories TEXT,
  loaded INTEGER,
  received INTEGER,
  international_baggage_id TEXT,
  reconciled_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (birs_report_id) REFERENCES birs_reports(id)
);

CREATE INDEX IF NOT EXISTS idx_international_baggages_rfid ON international_baggages(rfid_tag);
CREATE INDEX IF NOT EXISTS idx_international_baggages_status ON international_baggages(status);
CREATE INDEX IF NOT EXISTS idx_international_baggages_airport ON international_baggages(airport_code);
CREATE INDEX IF NOT EXISTS idx_international_baggages_birs_report ON international_baggages(birs_report_id);
CREATE INDEX IF NOT EXISTS idx_birs_reports_flight ON birs_reports(flight_number);
CREATE INDEX IF NOT EXISTS idx_birs_reports_airport ON birs_reports(airport_code);
CREATE INDEX IF NOT EXISTS idx_birs_reports_date ON birs_reports(flight_date);
CREATE INDEX IF NOT EXISTS idx_birs_report_items_report_id ON birs_report_items(birs_report_id);
CREATE INDEX IF NOT EXISTS idx_birs_report_items_bag_id ON birs_report_items(bag_id);
CREATE INDEX IF NOT EXISTS idx_birs_report_items_intl_baggage ON birs_report_items(international_baggage_id);
`;

