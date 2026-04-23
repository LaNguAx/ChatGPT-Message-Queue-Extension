import { ErrorCode } from '../queue/types';
import { findComposer, findStopButton, findSubmitButton } from './selectors';
import { log } from '../util/logger';

export type SendResult = { ok: true } | { ok: false; code: ErrorCode };

type Options = {
  postSendTimeoutMs?: number;
};

const waitFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ProseMirror wraps each input line in its own <p>; textContent joins them
// without the newline, so "a\nb" reads back as "a b". Normalise to compare.
function normaliseWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

async function writeTextViaExecCommand(el: HTMLElement, text: string): Promise<boolean> {
  el.focus();
  document.execCommand('selectAll', false);
  document.execCommand('delete', false);
  const lines = text.split('\n');
  for (const [i, line] of lines.entries()) {
    if (i > 0) document.execCommand('insertLineBreak', false);
    if (line) document.execCommand('insertText', false, line);
  }
  await waitFrame();
  const observed = el.textContent || '';
  // Strict match is the happy path. If it fails, don't block the queue —
  // ProseMirror may have transformed the text in ways we can't predict
  // (smart-quote autocorrect, bidi markers, normalisation). As long as the
  // composer isn't empty, we click send anyway. The "did send actually
  // transition to generating?" check catches real failures downstream.
  if (normaliseWhitespace(observed) === normaliseWhitespace(text)) return true;
  if (observed.trim().length > 0) {
    log.warn('composer content differs from input; proceeding anyway', {
      inputLen: text.length,
      observedLen: observed.length,
    });
    return true;
  }
  return false;
}

async function writeTextViaEvents(el: HTMLElement, text: string): Promise<boolean> {
  el.focus();
  el.textContent = '';
  el.dispatchEvent(new InputEvent('input', { inputType: 'deleteContentBackward', bubbles: true }));
  el.textContent = text;
  el.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: text, bubbles: true }));
  el.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: text, bubbles: true }));
  await waitFrame();
  const observed = el.textContent || '';
  if (normaliseWhitespace(observed) === normaliseWhitespace(text)) return true;
  if (observed.trim().length > 0) return true;
  return false;
}

export async function sendMessage(text: string, opts: Options = {}): Promise<SendResult> {
  const timeoutMs = opts.postSendTimeoutMs ?? 2000;
  const composer = findComposer();
  if (!composer) return { ok: false, code: 'composer-not-found' };

  let ok = await writeTextViaExecCommand(composer, text);
  if (!ok) {
    log.warn('execCommand write failed, trying event-based fallback');
    ok = await writeTextViaEvents(composer, text);
  }
  if (!ok) return { ok: false, code: 'composer-write-failed' };

  const btn = findSubmitButton();
  if (!btn) return { ok: false, code: 'send-button-not-found' };

  btn.click();

  // Verify state transition to generating within timeout
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (findStopButton() != null) return { ok: true };
    await wait(50);
  }
  return { ok: false, code: 'send-click-ignored' };
}
