import { useRef } from 'react';
import { QueueApi } from '../queue/queue';
import { QueueState } from '../queue/types';

type Props = { state: QueueState; queue: QueueApi };

export function PanelSettings({ state, queue }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatgpt-queue-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text) as QueueState;
    if (!Array.isArray(parsed.items)) throw new Error('invalid queue file');
    queue.replace({ ...parsed, running: false, currentId: undefined });
  };

  return (
    <div className="settings">
      <label className="settings-row">
        <span>Delay between messages: {(state.delayMs / 1000).toFixed(1)}s</span>
        <input
          type="range"
          min={0}
          max={60_000}
          step={500}
          value={state.delayMs}
          onChange={(e) => queue.setDelay(Number(e.target.value))}
        />
      </label>
      <div className="settings-actions">
        <button onClick={() => queue.clearCompleted()}>Clear completed</button>
        <button onClick={exportJson}>Export</button>
        <button onClick={() => fileRef.current?.click()}>Import</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importJson(f).catch((err) => alert('Import failed: ' + (err as Error).message));
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
