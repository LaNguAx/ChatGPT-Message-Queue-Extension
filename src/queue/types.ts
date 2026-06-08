export type QueueItemStatus = 'pending' | 'sending' | 'done' | 'failed';

export type QueueItem = {
  id: string;
  text: string;
  status: QueueItemStatus;
  addedAt: number;
  sentAt?: number;
  error?: ErrorCode;
};

export type QueueState = {
  items: QueueItem[];
  running: boolean;
  delayMs: number;
  currentId?: string;
};

export type ErrorCode =
  | 'composer-not-found'
  | 'composer-write-failed'
  | 'send-button-not-found'
  | 'send-click-ignored'
  | 'chatgpt-error-toast'
  | 'auth-wall'
  | 'selectors-stale';

export type DetectorEvent =
  | { type: 'idle' }
  | { type: 'generating' }
  | { type: 'error'; code: ErrorCode; message?: string };

export const STORAGE_KEY_STATE = 'chatgpt-queue:v1:state';

export const DEFAULT_STATE: QueueState = {
  items: [],
  running: false,
  delayMs: 2000,
};

export const IDLE_STABILITY_MS = 800;
