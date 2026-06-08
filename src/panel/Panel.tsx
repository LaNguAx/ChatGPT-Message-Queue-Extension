import { useEffect, useRef, useState } from 'react';
import { QueueApi } from '../queue/queue';
import { QueueState } from '../queue/types';
import { PanelList } from './PanelList';
import { PanelSettings } from './PanelSettings';

type Props = { queue: QueueApi };

export function Panel({ queue }: Props) {
  const [state, setState] = useState<QueueState>(queue.state);
  const [collapsed, setCollapsed] = useState(true);
  const [draft, setDraft] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => queue.subscribe((s) => setState(s)), [queue]);

  const pending = state.items.filter((i) => i.status === 'pending').length;
  const done = state.items.filter((i) => i.status === 'done').length;
  const failed = state.items.filter((i) => i.status === 'failed').length;

  const dotClass =
    failed > 0 ? 'error'
    : state.running ? 'running'
    : pending > 0 ? 'paused'
    : '';

  const onAdd = () => {
    const text = draft.trim();
    if (!text) return;
    queue.add(text);
    setDraft('');
    textareaRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onAdd();
    }
  };

  if (collapsed) {
    return (
      <button className="collapsed" onClick={() => setCollapsed(false)} aria-label="Open Prompt Queue for ChatGPT">
        <span className={`dot ${dotClass}`} />
        <span>
          {state.running ? '▶' : '⏸'} {pending} queued
        </span>
      </button>
    );
  }

  return (
    <div className="panel" role="region" aria-label="Prompt Queue for ChatGPT">
      <div className="header">
        <h1>
          <span className={`dot ${dotClass} header-dot`} />
          Prompt Queue
        </h1>
        <div className="header-actions">
          <button onClick={() => setShowSettings((s) => !s)} aria-label="Settings">⚙</button>
          <button onClick={() => setCollapsed(true)} aria-label="Collapse">—</button>
        </div>
      </div>

      <div className="body">
        <textarea
          ref={textareaRef}
          placeholder="Type a prompt…  (Ctrl+Enter to add)"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className="add-row">
          <button onClick={onAdd} disabled={!draft.trim()}>Add to queue</button>
          <div className="spacer" />
          {state.running ? (
            <button onClick={() => queue.pause()}>Pause</button>
          ) : (
            <button className="primary" onClick={() => queue.start()} disabled={pending === 0}>
              Start
            </button>
          )}
        </div>

        <PanelList state={state} queue={queue} />

        {showSettings && <PanelSettings state={state} queue={queue} />}
      </div>

      <div className="footer">
        <span>{done} sent · {pending} pending · {failed} failed</span>
      </div>
    </div>
  );
}
