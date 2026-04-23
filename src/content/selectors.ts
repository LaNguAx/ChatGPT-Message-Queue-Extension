const COMPOSER_SELECTORS = [
  '#prompt-textarea[contenteditable="true"]',
  'div[contenteditable="true"]#prompt-textarea',
  'form div[contenteditable="true"]',
  'div[contenteditable="true"]',
];

const SUBMIT_SELECTORS = [
  'button[data-testid="send-button"]',
  'button[aria-label="Send prompt"]',
  '#composer-submit-button',
];

const STOP_SELECTORS = [
  'button[data-testid="stop-button"]',
  'button[aria-label="Stop streaming"]',
];

const ERROR_TOAST_SELECTORS = [
  '[role="alert"]',
  '[data-testid="error-toast"]',
];

const AUTH_PATHS = ['/auth', '/login', '/auth/login'];

function firstMatch(selectors: string[]): HTMLElement | null {
  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el) return el;
  }
  return null;
}

export function findComposer(): HTMLElement | null {
  return firstMatch(COMPOSER_SELECTORS);
}

export function findSubmitButton(): HTMLButtonElement | null {
  return firstMatch(SUBMIT_SELECTORS) as HTMLButtonElement | null;
}

export function findStopButton(): HTMLButtonElement | null {
  return firstMatch(STOP_SELECTORS) as HTMLButtonElement | null;
}

export function isGenerating(): boolean {
  return findStopButton() != null;
}

const ERROR_RX = /\b(error|rate[- ]?limit|usage cap|try again|network|something went wrong)\b/i;

export function findErrorToast(): { element: HTMLElement; text: string } | null {
  for (const sel of ERROR_TOAST_SELECTORS) {
    const els = document.querySelectorAll<HTMLElement>(sel);
    for (const el of els) {
      const text = (el.textContent || '').trim();
      if (text && ERROR_RX.test(text)) return { element: el, text };
    }
  }
  return null;
}

export function isAuthWall(): boolean {
  return AUTH_PATHS.some((p) => location.pathname.startsWith(p));
}
