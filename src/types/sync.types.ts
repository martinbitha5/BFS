export type SyncTableName = 'passengers' | 'baggages' | 'boarding_status' | 'raw_scans';

// Note: 'CREATE' | 'UPDATE' | 'DELETE' pour raw_scans (snake_case API)
// 'insert' | 'update' | 'delete' pour baggages/passengers (ancien format, à migrer)
export type SyncOperation = 'CREATE' | 'UPDATE' | 'DELETE' | 'insert' | 'update' | 'delete';

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

