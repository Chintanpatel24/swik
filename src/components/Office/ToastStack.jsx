export default function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  const ICONS = { success: '✓', error: '✗', info: '◎', warn: '⚠' };

  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">{ICONS[t.type] || '◎'}</span>
          <span className="toast-text">{t.text}</span>
          <button className="toast-dismiss" onClick={() => onDismiss(t.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}
