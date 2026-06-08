import { useEffect, useRef, useState } from 'react';
import { QueueApi } from '../queue/queue';
import { QueueState } from '../queue/types';
import { PanelList } from './PanelList';
import { PanelSettings } from './PanelSettings';
import { BrandMark, MinimizeIcon, PauseIcon, PlayIcon, SettingsIcon } from './icons';

type Props = { queue: QueueApi };

function helperText(args: { count: number; failed: number; running: boolean; pending: number; done: number }): string {
  if (args.count === 0) return '';
  if (args.failed > 0) return 'A prompt failed - Retry or Skip it to keep going.';
  if (args.running) return 'Running - each prompt sends after the previous reply finishes.';
  if (args.pending > 0) return 'Press Start to send these automatically, one at a time.';
  if (args.done > 0) return 'All prompts sent.';
  return '';
}

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

  const hint = helperText({ count: state.items.length, failed, running: state.running, pending, done });

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
      <button
        className="pq-pill"
        onClick={() => setCollapsed(false)}
        aria-label="Open Prompt Queue for ChatGPT"
        title="Open Prompt Queue"
      >
        <span className="pq-pill__mark">
          <BrandMark size={18} />
        </span>
        <span className={`pq-status-dot ${dotClass}`} />
        <span className="pq-pill__label">Queue</span>
        <span className="pq-pill__count">{pending}</span>
      </button>
    );
  }

  return (
    <section className="pq-panel" aria-label="Prompt Queue for ChatGPT">
      <header className="pq-header">
        <div className="pq-brand">
          <span className="pq-brand__mark">
            <BrandMark size={20} />
          </span>
          <h1 className="pq-brand__title">Prompt Queue</h1>
          <span className={`pq-status-dot ${dotClass}`} title={dotClass || 'idle'} />
        </div>
        <div className="pq-header__actions">
          <button
            className="pq-icon-btn"
            onClick={() => setShowSettings((s) => !s)}
            aria-label="Settings"
            title="Settings: delay, export, import"
            aria-pressed={showSettings}
          >
            <SettingsIcon />
          </button>
          <button
            className="pq-icon-btn"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse"
            title="Collapse to a pill"
          >
            <MinimizeIcon />
          </button>
        </div>
      </header>

      <div className="pq-body">
        <div className="pq-compose">
          <textarea
            ref={textareaRef}
            className="pq-textarea"
            placeholder="Type a prompt…  (Ctrl+Enter to add)"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <div className="pq-compose__row">
            <button
              className="pq-btn"
              onClick={onAdd}
              disabled={!draft.trim()}
              title="Add this prompt to the queue (Ctrl+Enter)"
            >
              Add to queue
            </button>
            <span className="pq-spacer" />
            {state.running ? (
              <button className="pq-btn" onClick={() => queue.pause()} title="Stop sending after the current prompt">
                <PauseIcon /> Pause
              </button>
            ) : (
              <button
                className="pq-btn pq-btn--primary"
                onClick={() => queue.start()}
                disabled={pending === 0}
                title="Send queued prompts automatically, one after another"
              >
                <PlayIcon /> Start
              </button>
            )}
          </div>
        </div>

        {hint && <p className="pq-hint">{hint}</p>}

        <PanelList state={state} queue={queue} />

        {showSettings && <PanelSettings state={state} queue={queue} />}
      </div>

      <footer className="pq-footer">
        <span className={`pq-chip pq-chip--done ${done > 0 ? 'is-active' : ''}`} title="Prompts already sent">
          <b>{done}</b> sent
        </span>
        <span className="pq-chip pq-chip--pending" title="Prompts waiting to be sent">
          <b>{pending}</b> pending
        </span>
        <span className={`pq-chip pq-chip--failed ${failed > 0 ? 'is-active' : ''}`} title="Prompts that failed to send">
          <b>{failed}</b> failed
        </span>
      </footer>
    </section>
  );
}
