export interface BoardingStatus {
  id: string;
  passengerId: string;
  boarded: boolean;
  boardedAt?: string;
  boardedBy?: string;
  synced: boolean;
  createdAt: string;
}

