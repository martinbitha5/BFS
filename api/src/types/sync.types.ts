export type SyncTableName = 'passengers' | 'baggages' | 'boarding_status';

export type SyncOperation = 'insert' | 'update' | 'delete';

export interface SyncQueueItem {
  id: string;
  tableName: SyncTableName;
  recordId: string;
  operation: SyncOperation;
  data: string; // JSON stringified data
  retryCount: number;
  lastError?: string;
  userId: string;
  createdAt: string;
}

