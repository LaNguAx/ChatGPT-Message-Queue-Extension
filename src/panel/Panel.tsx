import { useEffect, useState } from 'react';
import { QueueApi } from '../queue/queue';
import { QueueState } from '../queue/types';

type Props = { queue: QueueApi };

export function Panel({ queue }: Props) {
  const [state, setState] = useState<QueueState>(queue.state);
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => queue.subscribe((s) => setState(s)), [queue]);

  const dotClass =
    state.items.some((i) => i.status === 'failed') ? 'error'
    : state.running ? 'running'
    : state.items.some((i) => i.status === 'pending') ? 'paused'
    : '';

  if (collapsed) {
    return (
      <button className="collapsed" onClick={() => setCollapsed(false)} aria-label="Open ChatGPT Queue">
        <span className={`dot ${dotClass}`} />
        <span>
          {state.running ? '▶' : '⏸'} {state.items.filter((i) => i.status === 'pending').length} queued
        </span>
      </button>
    );
  }

  return (
    <div className="panel">
      <div className="header">
        <h1>ChatGPT Queue</h1>
        <button onClick={() => setCollapsed(true)} aria-label="Collapse">—</button>
      </div>
      <div className="body">
        <div style={{ color: '#888' }}>Panel body — built out in Task 12</div>
      </div>
    </div>
  );
}
