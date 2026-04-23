import { createQueue } from '../queue/queue';
import { DetectorEvent, LOCK_HEARTBEAT_MS, STORAGE_KEY_LOCK } from '../queue/types';
import { loadState, saveState, onStateChange } from '../storage/storage';
import { acquireLock, heartbeat, isOwner, onLockChange, releaseLock } from '../storage/lock';
import { createDetector } from './detector';
import { sendMessage } from './sender';
import { mountPanel, PanelHandle } from '../panel/mount';
import { uuid } from '../util/uuid';
import { log } from '../util/logger';

let panelHandle: PanelHandle | undefined;

async function bootstrap() {
  if (document.getElementById('chatgpt-queue-host')) return; // already mounted
  log.info('bootstrap start');

  const tabId = uuid();
  const initialState = await loadState();
  const queue = createQueue(initialState);

  // Persist state changes (debounced)
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  queue.subscribe((s) => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void saveState(s);
    }, 250);
  });

  // Cross-tab sync: apply incoming state if we are NOT the owner
  onStateChange((s) => {
    void (async () => {
      if (!(await isOwner(tabId))) queue.replace(s);
    })();
  });

  // Lock lifecycle
  let readOnlyReason: string | null = null;

  const reflectOwnership = async () => {
    const mine = await isOwner(tabId);
    const next = mine ? null : 'Queue is active in another tab.';
    if (next !== readOnlyReason) {
      readOnlyReason = next;
      renderPanel();
    }
  };

  onLockChange(() => void reflectOwnership());

  const heartbeatInterval = setInterval(() => {
    void heartbeat(tabId);
  }, LOCK_HEARTBEAT_MS);

  await acquireLock(tabId);
  await reflectOwnership();

  function renderPanel() {
    if (panelHandle) panelHandle.unmount();
    panelHandle = mountPanel(queue, {
      readOnlyReason,
      onTakeOver: async () => {
        // Force-claim the lock
        await chrome.storage.local.set({
          [STORAGE_KEY_LOCK]: { tabId, heartbeatAt: Date.now() },
        });
        await reflectOwnership();
      },
    });
  }
  renderPanel();

  // Detector → queue driver
  let pendingRunTimer: ReturnType<typeof setTimeout> | undefined;

  const onEvent = async (ev: DetectorEvent) => {
    if (!(await isOwner(tabId))) return;
    log.debug('detector event', ev);

    if (ev.type === 'error') {
      // If we have a currently-sending item, mark it failed
      const curId = queue.state.currentId;
      if (curId) queue.markFailed(curId, ev.code);
      queue.pause();
      return;
    }

    if (ev.type === 'generating') {
      // Generation is in flight. If nothing is tracked as sending, the user likely
      // sent manually — respect it and do not interfere.
      return;
    }

    if (ev.type === 'idle') {
      const curId = queue.state.currentId;
      if (curId) queue.markDone(curId);
      maybeFireNext();
    }
  };

  const maybeFireNext = () => {
    if (pendingRunTimer) clearTimeout(pendingRunTimer);
    if (!queue.state.running) return;
    const next = queue.nextPending();
    if (!next) return;
    pendingRunTimer = setTimeout(async () => {
      if (!queue.state.running) return;
      const item = queue.nextPending();
      if (!item) return;
      queue.markSending(item.id);
      const result = await sendMessage(item.text);
      if (!result.ok) {
        queue.markFailed(item.id, result.code);
        queue.pause();
      }
      // On success we wait for the detector's idle event to call markDone.
    }, queue.state.delayMs);
  };

  // Re-evaluate firing when queue state changes (user pressed Start, edited delay, etc.)
  queue.subscribe(() => maybeFireNext());

  const detector = createDetector((ev) => {
    void onEvent(ev);
  });
  detector.start();

  window.addEventListener('pagehide', () => {
    clearInterval(heartbeatInterval);
    if (pendingRunTimer) clearTimeout(pendingRunTimer);
    if (saveTimer) clearTimeout(saveTimer);
    void releaseLock(tabId);
    detector.stop();
    panelHandle?.unmount();
  });
}

void bootstrap();
