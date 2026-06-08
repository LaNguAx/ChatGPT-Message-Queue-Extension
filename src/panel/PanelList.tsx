import { useRef, useState } from 'react';
import { QueueApi } from '../queue/queue';
import { QueueItem, QueueItemStatus, QueueState } from '../queue/types';
import { useFlip } from './useFlip';
import { AlertIcon, CheckIcon, ClockIcon, CloseIcon, GripIcon, InboxIcon, SpinnerIcon } from './icons';

type Props = { state: QueueState; queue: QueueApi };
type DropTarget = { idx: number; pos: 'before' | 'after' };

const REMOVE_MS = 200;
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function StatusIcon({ status }: { status: QueueItemStatus }) {
  if (status === 'sending') return <SpinnerIcon className="pq-spin" />;
  if (status === 'done') return <CheckIcon />;
  if (status === 'failed') return <AlertIcon />;
  return <ClockIcon />;
}

function statusLabel(status: QueueItemStatus): string {
  if (status === 'sending') return 'Sending...';
  if (status === 'done') return 'Sent';
  if (status === 'failed') return 'Failed - Retry or Skip';
  return 'Waiting to send';
}

export function PanelList({ state, queue }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLUListElement>(null);

  useFlip(listRef, state.items.map((i) => i.id).join('|'));

  const isEditable = (it: QueueItem) => it.status === 'pending' || it.status === 'failed';

  const beginEdit = (it: QueueItem) => {
    if (!isEditable(it)) return; // only un-sent prompts can be edited
    setEditingId(it.id);
    setEditText(it.text);
  };

  const commitEdit = () => {
    if (editingId) queue.edit(editingId, editText);
    setEditingId(null);
  };

  const onRemove = (e: React.MouseEvent, id: string) => {
    const li = (e.currentTarget as HTMLElement).closest('li.pq-item');
    if (prefersReducedMotion() || !(li instanceof HTMLElement)) {
      queue.remove(id);
      return;
    }
    li.style.maxHeight = `${li.offsetHeight}px`;
    void li.offsetHeight; // force reflow so the collapse transition has a start value
    setRemoving((s) => new Set(s).add(id));
    window.setTimeout(() => {
      queue.remove(id);
      setRemoving((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }, REMOVE_MS);
  };

  const onDrop = (idx: number) => {
    const from = draggingId != null ? state.items.findIndex((i) => i.id === draggingId) : -1;
    setDraggingId(null);
    setDropTarget(null);
    if (from < 0) return;
    const target = dropTarget && dropTarget.idx === idx ? dropTarget : { idx, pos: 'before' as const };
    const insertion = target.pos === 'after' ? idx + 1 : idx;
    let to = from < insertion ? insertion - 1 : insertion;
    to = Math.max(0, Math.min(state.items.length - 1, to));
    if (to !== from) queue.move(from, to);
  };

  if (state.items.length === 0) {
    return (
      <div className="pq-empty">
        <InboxIcon className="pq-empty__icon" />
        <div className="pq-empty__title">No prompts queued yet</div>
        <ol className="pq-empty__steps">
          <li>Type a prompt, then Add to queue.</li>
          <li>Queue as many as you like.</li>
          <li>Press Start - replies send automatically.</li>
        </ol>
      </div>
    );
  }

  return (
    <>
    <ul className="pq-list" ref={listRef}>
      {state.items.map((it, idx) => {
        const isEditing = editingId === it.id;
        const showDrop = dropTarget?.idx === idx && it.id !== draggingId;
        const cls = [
          'pq-item',
          it.status,
          it.id === draggingId ? 'pq-item--dragging' : '',
          removing.has(it.id) ? 'pq-item--removing' : '',
          showDrop && dropTarget?.pos === 'before' ? 'pq-item--drop-before' : '',
          showDrop && dropTarget?.pos === 'after' ? 'pq-item--drop-after' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <li
            key={it.id}
            data-id={it.id}
            className={cls}
            onDragOver={(e) => {
              if (draggingId == null) return;
              e.preventDefault();
              const r = e.currentTarget.getBoundingClientRect();
              const pos = e.clientY > r.top + r.height / 2 ? 'after' : 'before';
              if (dropTarget?.idx !== idx || dropTarget?.pos !== pos) setDropTarget({ idx, pos });
            }}
            onDrop={() => onDrop(idx)}
          >
            <span
              className="pq-item__handle"
              title="Drag to reorder"
              draggable={!isEditing}
              onDragStart={(e) => {
                setDraggingId(it.id);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', it.id);
                const li = (e.currentTarget as HTMLElement).closest('li.pq-item');
                if (li instanceof HTMLElement) e.dataTransfer.setDragImage(li, 16, 16);
              }}
              onDragEnd={() => {
                setDraggingId(null);
                setDropTarget(null);
              }}
              aria-hidden
            >
              <GripIcon />
            </span>
            <span className="pq-item__status" title={statusLabel(it.status)} aria-label={statusLabel(it.status)}>
              <StatusIcon status={it.status} />
            </span>
            <div
              className={`pq-item__body${isEditable(it) ? ' pq-item__body--editable' : ''}`}
              onDoubleClick={isEditable(it) ? () => beginEdit(it) : undefined}
              title={isEditable(it) && !isEditing ? 'Double-click to edit' : undefined}
            >
              {isEditing ? (
                <textarea
                  className="pq-item__edit"
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
                <span className="pq-item__text">{it.text}</span>
              )}
              {it.status === 'failed' && <span className="pq-item__error">Error: {it.error ?? 'unknown'}</span>}
            </div>
            <div className="pq-item__actions">
              {it.status === 'failed' && (
                <>
                  <button
                    className="pq-btn pq-btn--ghost"
                    onClick={() => queue.retry(it.id)}
                    title="Try this prompt again"
                  >
                    Retry
                  </button>
                  <button
                    className="pq-btn pq-btn--ghost"
                    onClick={() => queue.skip(it.id)}
                    title="Skip this prompt and mark it done"
                  >
                    Skip
                  </button>
                </>
              )}
              {it.status !== 'sending' && (
                <button
                  className="pq-icon-btn pq-icon-btn--sm pq-item__remove"
                  onClick={(e) => onRemove(e, it.id)}
                  aria-label="Remove"
                  title="Remove from queue"
                >
                  <CloseIcon />
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
    {state.items.length >= 2 && (
      <p className="pq-list-hint">Drag to reorder &middot; double-click to edit</p>
    )}
    </>
  );
}
