import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sendMessage } from '../src/content/sender';

function mkComposer(textGetter: () => string) {
  document.body.innerHTML = `
    <form>
      <div id="prompt-textarea" contenteditable="true"></div>
      <button data-testid="send-button"></button>
    </form>
  `;
  const composer = document.querySelector<HTMLElement>('#prompt-textarea')!;
  const sendBtn = document.querySelector<HTMLButtonElement>('[data-testid="send-button"]')!;
  // mock execCommand to write into composer
  (document as any).execCommand = vi.fn((cmd: string, _ui: boolean, arg?: string) => {
    if (cmd === 'selectAll' || cmd === 'delete') {
      composer.textContent = '';
      return true;
    }
    if (cmd === 'insertText' && typeof arg === 'string') {
      composer.textContent = (composer.textContent || '') + arg;
      return true;
    }
    if (cmd === 'insertLineBreak') {
      composer.textContent = (composer.textContent || '') + '\n';
      return true;
    }
    return false;
  });
  const clicks: string[] = [];
  sendBtn.addEventListener('click', () => {
    clicks.push('send');
    // Simulate ChatGPT entering generating state
    sendBtn.setAttribute('data-testid', 'stop-button');
  });
  return { composer, sendBtn, clicks, readText: () => composer.textContent || '' };
}

describe('sendMessage', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('writes text into the composer and clicks send', async () => {
    const h = mkComposer(() => '');
    const result = await sendMessage('hello world', { postSendTimeoutMs: 500 });
    expect(result).toEqual({ ok: true });
    expect(h.readText()).toBe('hello world');
    expect(h.clicks).toEqual(['send']);
  });

  it('fails with composer-not-found when no composer exists', async () => {
    document.body.innerHTML = '<div>nope</div>';
    const result = await sendMessage('x', { postSendTimeoutMs: 100 });
    expect(result).toEqual({ ok: false, code: 'composer-not-found' });
  });

  it('fails with send-click-ignored when no state change follows click', async () => {
    document.body.innerHTML = `
      <form>
        <div id="prompt-textarea" contenteditable="true"></div>
        <button data-testid="send-button"></button>
      </form>
    `;
    (document as any).execCommand = vi.fn((cmd: string, _u: boolean, arg?: string) => {
      if (cmd === 'insertText' && typeof arg === 'string') {
        document.querySelector('#prompt-textarea')!.textContent = arg;
        return true;
      }
      return true;
    });
    // send button does nothing when clicked — stays a send-button
    const result = await sendMessage('x', { postSendTimeoutMs: 200 });
    expect(result).toEqual({ ok: false, code: 'send-click-ignored' });
  });

  it('handles multi-line text with line breaks', async () => {
    const h = mkComposer(() => '');
    await sendMessage('line1\nline2', { postSendTimeoutMs: 500 });
    expect(h.readText()).toBe('line1\nline2');
  });
});
