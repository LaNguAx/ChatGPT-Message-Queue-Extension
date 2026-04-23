import { useState } from 'react';
import { QueueApi } from '../queue/queue';
import { QueueItem, QueueState } from '../queue/types';

type Props = { state: QueueState; queue: QueueApi; readOnly: boolean };

export function PanelList({ state, queue, readOnly }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  const beginEdit = (it: QueueItem) => {
    if (readOnly) return;
    setEditingId(it.id);
    setEditText(it.text);
  };

  const commitEdit = () => {
    if (editingId) queue.edit(editingId, editText);
    setEditingId(null);
  };

  return (
    <ul className="list">
      {state.items.map((it, idx) => (
        <li
          key={it.id}
          className={`item ${it.status}`}
          draggable={!readOnly && editingId !== it.id}
          onDragStart={() => setDragFrom(idx)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragFrom != null && dragFrom !== idx) queue.move(dragFrom, idx);
            setDragFrom(null);
          }}
        >
          <div className="item-text" onDoubleClick={() => beginEdit(it)}>
            {editingId === it.id ? (
              <textarea
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    commitEdit();
                  } else if (e.key === 'Escape') {
                    setEditingId(null);
                  }
                }}
              />
            ) : (
              <>{it.text}</>
            )}
            {it.status === 'failed' && (
              <div style={{ marginTop: 4, fontSize: 12, color: '#b91c1c' }}>
                Error: {it.error ?? 'unknown'}
              </div>
            )}
          </div>
          <div className="item-actions">
            {it.status === 'failed' && (
              <>
                <button onClick={() => queue.retry(it.id)} disabled={readOnly}>Retry</button>
                <button onClick={() => queue.skip(it.id)} disabled={readOnly}>Skip</button>
              </>
            )}
            {it.status !== 'sending' && (
              <button onClick={() => queue.remove(it.id)} disabled={readOnly} aria-label="Remove">×</button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
