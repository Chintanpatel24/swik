import { useEffect, useRef } from 'react';

const ICON_CLASS = { ok: 'log-ok', err: 'log-err', fetch: 'log-fetch', ai: 'log-ai', warn: 'log-warn', info: 'log-info' };

export default function ActivityLog({ logs, onClearLogs }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  const fmt = (iso) => {
    try { return new Date(iso).toTimeString().slice(0, 8); } catch { return '--:--:--'; }
  };

  return (
    <div className="panel log-panel">
      <div className="panel-header">
        <span className="panel-title">AGENT ACTIVITY</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="clear-btn" onClick={onClearLogs} title="Clear logs">CLR</button>
          <span className="panel-badge">{logs.length} EVENTS</span>
        </div>
      </div>

      <div className="log-scroll">
        {logs.map((entry, i) => (
          <div key={entry.id || i} className="log-line">
            <span className="log-time">{fmt(entry.timestamp || entry.created_at)}</span>
            <span className={`log-icon ${ICON_CLASS[entry.level] || 'log-info'}`}>{entry.icon}</span>
            <span className={`log-msg log-msg--${entry.level}`}>{entry.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
