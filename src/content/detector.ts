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

  // The stale-timer fires if we go too long without seeing any known ChatGPT signal
  // (composer, send button, or stop button). It is reset ONLY when a signal is present —
  // so a continuously-mutating page without selectors (e.g. selector regression during
  // streaming) still triggers the warning.
  const resetStaleTimer = () => {
    if (staleTimer) clearTimeout(staleTimer);
    staleTimer = setTimeout(() => {
      if (!findComposer() && !findSubmitButton() && !findStopButton()) {
        emit({ type: 'error', code: 'selectors-stale' });
      }
    }, selectorStaleMs);
  };

  const sawKnownSignal = (): boolean =>
    findComposer() != null || findSubmitButton() != null || findStopButton() != null;

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

    // Not generating — start / keep the idle-stability timer.
    // error → idle recovery naturally lands here once the toast disappears.
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
        if (sawKnownSignal()) resetStaleTimer();
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
