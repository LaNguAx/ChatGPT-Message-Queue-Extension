import { ErrorCode } from '../queue/types';
import { findComposer, findStopButton, findSubmitButton } from './selectors';
import { log } from '../util/logger';

export type SendResult = { ok: true } | { ok: false; code: ErrorCode };

type Options = {
  postSendTimeoutMs?: number;
};

const waitFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ProseMirror wraps each input line in its own <p>, and `textContent` joins
// paragraphs without the original newline — so "a\nb" becomes "a b" once read
// back. Normalise both sides to collapse runs of whitespace before comparing,
// so multi-line prompts still verify as successfully written.
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
  return normaliseWhitespace(el.textContent || '') === normaliseWhitespace(text);
}

async function writeTextViaEvents(el: HTMLElement, text: string): Promise<boolean> {
  el.focus();
  el.textContent = '';
  el.dispatchEvent(new InputEvent('input', { inputType: 'deleteContentBackward', bubbles: true }));
  el.textContent = text;
  el.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: text, bubbles: true }));
  el.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: text, bubbles: true }));
  await waitFrame();
  return normaliseWhitespace(el.textContent || '') === normaliseWhitespace(text);
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
