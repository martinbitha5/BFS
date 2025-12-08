export type ScanType = 'boarding_pass' | 'baggage_tag';

export type ScanStatusField = 'checkin' | 'baggage' | 'boarding' | 'arrival';

export interface RawScan {
    id: string;
    rawData: string;
    scanType: ScanType;

    // Statuts du workflow
    statusCheckin: boolean;
    statusBaggage: boolean;
    statusBoarding: boolean;
    statusArrival: boolean;

    // Métadonnées check-in
    checkinAt?: string;
    checkinBy?: string;

    // Métadonnées baggage
    baggageAt?: string;
    baggageBy?: string;
    baggageRfidTag?: string;

    // Métadonnées boarding
    boardingAt?: string;
    boardingBy?: string;

    // Métadonnées arrival
    arrivalAt?: string;
    arrivalBy?: string;

    // Métadonnées générales
    airportCode: string;
    firstScannedAt: string;
    lastScannedAt: string;
    scanCount: number;

    // Synchronisation
    synced: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateRawScanParams {
    rawData: string;
    scanType: ScanType;
    statusField: ScanStatusField;
    userId: string;
    airportCode: string;
    baggageRfidTag?: string;
}

export interface RawScanResult {
    id: string;
    isNew: boolean;
    scanCount: number;
}
