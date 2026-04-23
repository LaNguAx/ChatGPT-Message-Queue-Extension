import { DetectorEvent, IDLE_STABILITY_MS } from '../queue/types';
import { findComposer, findErrorToast, findStopButton, findSubmitButton, isAuthWall } from './selectors';

type Options = {
  idleStabilityMs?: number;
  selectorStaleMs?: number;
};

type State = 'unknown' | 'idle' | 'generating' | 'error';

export type Detector = {
  start: () => void;
  stop: () => void;
};

export function createDetector(emit: (ev: DetectorEvent) => void, opts: Options = {}): Detector {
  const idleStabilityMs = opts.idleStabilityMs ?? IDLE_STABILITY_MS;
  const selectorStaleMs = opts.selectorStaleMs ?? 15_000;

  let current: State = 'unknown';
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let staleTimer: ReturnType<typeof setTimeout> | undefined;
  let observer: MutationObserver | undefined;

  const clearIdle = () => {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = undefined;
    }
  };

  const resetStaleTimer = () => {
    if (staleTimer) clearTimeout(staleTimer);
    staleTimer = setTimeout(() => {
      if (!findComposer() && !findSubmitButton() && !findStopButton()) {
        emit({ type: 'error', code: 'selectors-stale' });
      }
    }, selectorStaleMs);
  };

  const scan = () => {
    if (isAuthWall()) {
      if (current !== 'error') {
        current = 'error';
        emit({ type: 'error', code: 'auth-wall' });
      }
      return;
    }

    const toast = findErrorToast();
    if (toast) {
      if (current !== 'error') {
        current = 'error';
        emit({ type: 'error', code: 'chatgpt-error-toast', message: toast.text });
      }
      return;
    }

    const generating = findStopButton() != null;
    if (generating) {
      clearIdle();
      if (current !== 'generating') {
        current = 'generating';
        emit({ type: 'generating' });
      }
      return;
    }

    // Not generating — start / keep the idle-stability timer
    if (current !== 'idle' && !idleTimer) {
      idleTimer = setTimeout(() => {
        current = 'idle';
        emit({ type: 'idle' });
        idleTimer = undefined;
      }, idleStabilityMs);
    }
  };

  return {
    start: () => {
      observer = new MutationObserver(() => {
        resetStaleTimer();
        scan();
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
      resetStaleTimer();
      scan();
    },
    stop: () => {
      observer?.disconnect();
      observer = undefined;
      clearIdle();
      if (staleTimer) clearTimeout(staleTimer);
      staleTimer = undefined;
      current = 'unknown';
    },
  };
}
