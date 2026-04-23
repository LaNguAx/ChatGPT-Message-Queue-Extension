import { createRoot, Root } from 'react-dom/client';
import { Panel } from './Panel';
import { QueueApi } from '../queue/queue';
import { detectTheme, onThemeChange } from './theme';
import panelCss from './panel.css?raw';

export type PanelOptions = {
  readOnlyReason?: string | null;
  onTakeOver?: () => void;
};

export type PanelHandle = { unmount: () => void };

export function mountPanel(queue: QueueApi, opts: PanelOptions = {}): PanelHandle {
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

  const root: Root = createRoot(container);
  root.render(<Panel queue={queue} readOnlyReason={opts.readOnlyReason ?? null} onTakeOver={opts.onTakeOver} />);

  return {
    unmount: () => {
      offTheme();
      root.unmount();
      host.remove();
    },
  };
}
