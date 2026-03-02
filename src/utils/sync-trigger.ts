/**
 * Déclenche une sync immédiate quand des items sont ajoutés à la queue.
 * Évite les dépendances circulaires entre database et sync.
 */
let onQueueUpdated: (() => void) | null = null;

export function setSyncQueueCallback(callback: (() => void) | null): void {
  onQueueUpdated = callback;
}

export function notifySyncQueueUpdated(): void {
  onQueueUpdated?.();
}
