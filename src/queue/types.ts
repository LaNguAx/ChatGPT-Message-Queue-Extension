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

export type TabLock = {
  tabId: string;
  heartbeatAt: number;
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
export const STORAGE_KEY_LOCK = 'chatgpt-queue:v1:lock';
export const STORAGE_KEY_POSITION = 'chatgpt-queue:v1:position';

export const DEFAULT_STATE: QueueState = {
  items: [],
  running: false,
  delayMs: 2000,
};

export const IDLE_STABILITY_MS = 800;
export const LOCK_STALE_MS = 10_000;
export const LOCK_HEARTBEAT_MS = 3_000;
