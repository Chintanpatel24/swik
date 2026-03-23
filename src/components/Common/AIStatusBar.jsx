import { useEffect, useState } from 'react';

const BASE = import.meta.env.DEV ? 'http://localhost:7843' : '';

export default function AIStatusBar({ serverConfig }) {
  const [status, setStatus] = useState({ ok: null, models: [], error: null });
  const provider = serverConfig?.defaultProvider || 'ollama';

  useEffect(() => {
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [provider]);

  async function check() {
    try {
      const r = await fetch(`${BASE}/api/ai/status?provider=${provider}`);
      const d = await r.json();
      setStatus(d);
    } catch {
      setStatus({ ok: false, error: 'Backend unreachable' });
    }
  }

  return (
    <div className={`ai-bar ai-bar-${status.ok ? 'ok' : status.ok === null ? 'checking' : 'err'}`}>
      <span className="ai-bar-dot"/>
      <span className="ai-bar-label">
        {provider.toUpperCase()}
        {status.ok === null && ' — checking…'}
        {status.ok === true  && status.models?.length > 0 && ` — ${status.models.slice(0,2).join(', ')}`}
        {status.ok === true  && !status.models?.length     && ' — connected'}
        {status.ok === false && ` — ${status.error || 'unreachable'}`}
      </span>
      {status.ok === false && provider === 'ollama' && (
        <span className="ai-bar-hint">Run: <code>ollama serve</code></span>
      )}
    </div>
  );
}
