import { createRoot, Root } from 'react-dom/client';
import { Panel } from './Panel';
import { QueueApi } from '../queue/queue';
import { detectTheme, onThemeChange } from './theme';
import panelCss from './panel.css?raw';

export type PanelHandle = { unmount: () => void };

export function mountPanel(queue: QueueApi): PanelHandle {
  const host = document.createElement('div');
  host.id = 'chatgpt-queue-host';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = panelCss;
  shadow.appendChild(style);
  const container = document.createElement('div');
  shadow.appendChild(container);

  const setTheme = (t: 'light' | 'dark') => host.setAttribute('data-theme', t);
  setTheme(detectTheme());
  const offTheme = onThemeChange(setTheme);

  // ChatGPT focuses its own composer whenever a key is pressed outside an input.
  // Our inputs live in this shadow root, but keyboard events are composed and
  // bubble out to the page, where they retarget to the host element (not an
  // input) - so ChatGPT steals focus mid-typing. Stop the keyboard family at the
  // host boundary so it never reaches ChatGPT's listener. React delegates its
  // own listeners to the container inside the shadow (earlier in the bubble
  // path), so the panel's shortcuts still work.
  const keyEvents = ['keydown', 'keyup', 'keypress', 'beforeinput'] as const;
  const stopKeys = (e: Event) => e.stopPropagation();
  for (const type of keyEvents) host.addEventListener(type, stopKeys);

  const root: Root = createRoot(container);
  root.render(<Panel queue={queue} />);

  return {
    unmount: () => {
      offTheme();
      for (const type of keyEvents) host.removeEventListener(type, stopKeys);
      root.unmount();
      host.remove();
    },
  };
}
