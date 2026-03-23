import { useState, useEffect } from 'react';

export default function OllamaStatus() {
  const [status, setStatus] = useState({ checking: true, ok: false, error: null, models: [] });

  const check = async () => {
    setStatus(s => ({ ...s, checking: true }));
    try {
      const res = await fetch('/api/ollama');
      const data = await res.json();
      setStatus({ checking: false, ok: data.ok, error: data.error || null, models: data.models || [] });
    } catch {
      setStatus({ checking: false, ok: false, error: 'Backend unreachable', models: [] });
    }
  };

  useEffect(() => {
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, []);

  if (status.checking) {
    return <span className="ollama-pill ollama-checking">⬡ OLLAMA CHECKING...</span>;
  }

  if (!status.ok) {
    return (
      <span className="ollama-pill ollama-err" title={status.error}>
        ✗ OLLAMA OFFLINE
      </span>
    );
  }

  const model = status.models?.[0] || 'ready';
  return (
    <span className="ollama-pill ollama-ok" title={`Models: ${status.models.join(', ')}`}>
      ⬡ OLLAMA · {model}
    </span>
  );
}
