import { createQueue } from '../queue/queue';
import { DetectorEvent } from '../queue/types';
import { loadState, saveState } from '../storage/storage';
import { createDetector } from './detector';
import { sendMessage } from './sender';
import { mountPanel, PanelHandle } from '../panel/mount';
import { log } from '../util/logger';

let panelHandle: PanelHandle | undefined;

async function bootstrap() {
  if (document.getElementById('chatgpt-queue-host')) return; // already mounted
  log.info('bootstrap start');

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

  panelHandle = mountPanel(queue);

  // Detector → queue driver
  let pendingRunTimer: ReturnType<typeof setTimeout> | undefined;
  let sending = false;

  const onEvent = (ev: DetectorEvent) => {
    log.debug('detector event', ev);

    if (ev.type === 'error') {
      const curId = queue.state.currentId;
      if (curId) queue.markFailed(curId, ev.code);
      queue.pause();
      return;
    }

    if (ev.type === 'generating') {
      // Generation is in flight. If nothing is tracked as sending, the user
      // likely sent manually — respect it and don't interfere.
      return;
    }

    if (ev.type === 'idle') {
      const curId = queue.state.currentId;
      if (curId) queue.markDone(curId);
      maybeFireNext();
    }
  };

  const maybeFireNext = () => {
    // Guard: never fire if a send is in-flight or an item is marked sending.
    // Without this guard, every queue mutation (including markSending itself)
    // re-schedules this function and races the in-flight sender.
    if (sending) return;
    if (queue.state.currentId) return;

    if (pendingRunTimer) clearTimeout(pendingRunTimer);
    if (!queue.state.running) return;
    const next = queue.nextPending();
    if (!next) return;

    pendingRunTimer = setTimeout(async () => {
      pendingRunTimer = undefined;
      if (!queue.state.running) return;
      if (queue.state.currentId) return;
      const item = queue.nextPending();
      if (!item) return;
      sending = true;
      try {
        queue.markSending(item.id);
        const result = await sendMessage(item.text);
        if (!result.ok) {
          queue.markFailed(item.id, result.code);
          queue.pause();
        }
      } finally {
        sending = false;
      }
    }, queue.state.delayMs);
  };

  queue.subscribe(() => maybeFireNext());

  const detector = createDetector((ev) => onEvent(ev));
  detector.start();

  window.addEventListener('pagehide', () => {
    if (pendingRunTimer) clearTimeout(pendingRunTimer);
    if (saveTimer) clearTimeout(saveTimer);
    detector.stop();
    panelHandle?.unmount();
  });
}

void bootstrap();
