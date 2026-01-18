export interface BoardingStatus {
  id: string;
  passengerId: string;
  boarded: boolean;
  boardedAt?: string;
  boardedBy?: string;
  gate?: string;
  synced: boolean;
  createdAt: string;
  scanHash?: string; // SHA256 hash du boarding pass (pour sync sans rawData)
}

