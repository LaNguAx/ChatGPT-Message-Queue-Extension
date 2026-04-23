import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDetector } from '../src/content/detector';
import { DetectorEvent } from '../src/queue/types';

function set(html: string) {
  document.body.innerHTML = html;
}

const IDLE_HTML = '<button data-testid="send-button"></button>';
const GEN_HTML = '<button data-testid="stop-button"></button>';
const ERR_HTML = '<button data-testid="send-button"></button><div role="alert">Network error. Please try again.</div>';

describe('detector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  it('emits initial idle when page is idle', async () => {
    set(IDLE_HTML);
    const events: DetectorEvent[] = [];
    const d = createDetector((e) => events.push(e), { idleStabilityMs: 50 });
    d.start();
    await vi.advanceTimersByTimeAsync(100);
    expect(events.some((e) => e.type === 'idle')).toBe(true);
    d.stop();
  });

  it('emits generating when stop-button appears', async () => {
    set(IDLE_HTML);
    const events: DetectorEvent[] = [];
    const d = createDetector((e) => events.push(e), { idleStabilityMs: 50 });
    d.start();
    await vi.advanceTimersByTimeAsync(100);
    events.length = 0;
    set(GEN_HTML);
    await vi.advanceTimersByTimeAsync(100);
    expect(events.some((e) => e.type === 'generating')).toBe(true);
    d.stop();
  });

  it('emits idle only after idleStabilityMs of stop-button absence', async () => {
    set(GEN_HTML);
    const events: DetectorEvent[] = [];
    const d = createDetector((e) => events.push(e), { idleStabilityMs: 500 });
    d.start();
    await vi.advanceTimersByTimeAsync(10);
    events.length = 0;
    set(IDLE_HTML);
    // briefly flicker back to generating
    await vi.advanceTimersByTimeAsync(200);
    set(GEN_HTML);
    await vi.advanceTimersByTimeAsync(200);
    set(IDLE_HTML);
    // should NOT have emitted idle yet
    expect(events.filter((e) => e.type === 'idle')).toHaveLength(0);
    // hold idle past stability window
    await vi.advanceTimersByTimeAsync(600);
    expect(events.some((e) => e.type === 'idle')).toBe(true);
    d.stop();
  });

  it('emits error when an error toast appears', async () => {
    set(IDLE_HTML);
    const events: DetectorEvent[] = [];
    const d = createDetector((e) => events.push(e), { idleStabilityMs: 50 });
    d.start();
    await vi.advanceTimersByTimeAsync(100);
    events.length = 0;
    set(ERR_HTML);
    await vi.advanceTimersByTimeAsync(100);
    expect(events.some((e) => e.type === 'error' && e.code === 'chatgpt-error-toast')).toBe(true);
    d.stop();
  });

  it('reports selectors-stale if no signals present for too long', async () => {
    set('<div>nothing useful</div>');
    const events: DetectorEvent[] = [];
    const d = createDetector((e) => events.push(e), { idleStabilityMs: 50, selectorStaleMs: 500 });
    d.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(events.some((e) => e.type === 'error' && e.code === 'selectors-stale')).toBe(true);
    d.stop();
  });

  it('selectors-stale fires even with mutations if no known signal is present', async () => {
    set('<div>nothing</div>');
    const events: DetectorEvent[] = [];
    const d = createDetector((e) => events.push(e), { idleStabilityMs: 50, selectorStaleMs: 500 });
    d.start();
    // Mutate continuously without adding a known signal
    for (let i = 0; i < 10; i++) {
      document.body.appendChild(document.createTextNode(`tick-${i}`));
      await vi.advanceTimersByTimeAsync(50);
    }
    // Total elapsed: ~500ms of mutations, no known signal — stale should fire
    await vi.advanceTimersByTimeAsync(600);
    expect(events.some((e) => e.type === 'error' && e.code === 'selectors-stale')).toBe(true);
    d.stop();
  });

  it('recovers error → idle → generating when toast is dismissed and user resends', async () => {
    set(ERR_HTML);
    const events: DetectorEvent[] = [];
    const d = createDetector((e) => events.push(e), { idleStabilityMs: 50 });
    d.start();
    await vi.advanceTimersByTimeAsync(100);
    // Dismiss toast
    set(IDLE_HTML);
    await vi.advanceTimersByTimeAsync(100);
    // Start new generation
    set(GEN_HTML);
    await vi.advanceTimersByTimeAsync(100);

    const seq = events.map((e) => (e.type === 'error' ? `error:${e.code}` : e.type));
    // Expect: error → idle → generating (in order)
    const errorIdx = seq.findIndex((s) => s.startsWith('error'));
    const idleIdx = seq.indexOf('idle', errorIdx);
    const genIdx = seq.indexOf('generating', idleIdx);
    expect(errorIdx).toBeGreaterThanOrEqual(0);
    expect(idleIdx).toBeGreaterThan(errorIdx);
    expect(genIdx).toBeGreaterThan(idleIdx);
    d.stop();
  });

  it('stop() prevents further emissions on subsequent DOM mutations', async () => {
    set(IDLE_HTML);
    const events: DetectorEvent[] = [];
    const d = createDetector((e) => events.push(e), { idleStabilityMs: 50 });
    d.start();
    await vi.advanceTimersByTimeAsync(100);
    d.stop();
    events.length = 0;
    set(GEN_HTML);
    await vi.advanceTimersByTimeAsync(200);
    expect(events).toHaveLength(0);
  });
});
