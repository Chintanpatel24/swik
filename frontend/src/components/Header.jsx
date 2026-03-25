export default function Header({ connected, agentCount, taskRunning, networkStrength, pythonOk, onNewAgent }) {
  return (
    <header className="app-header">
      <div className="header-logo">
        <div>
          <div className="header-logo-mark">NEXUS</div>
          <div className="header-logo-sub">AI Agent Platform</div>
        </div>
      </div>

      <div className="header-status">
        <div className="header-stat">
          <span className={`status-dot ${connected ? 'online' : 'offline'}`} />
          {connected ? 'Connected' : 'Connecting…'}
        </div>
        <div className="header-stat">
          ⬡ <strong>{agentCount}</strong> agents
        </div>
        {taskRunning > 0 && (
          <div className="header-stat">
            <span className="status-dot working" />
            <strong>{taskRunning}</strong> running
          </div>
        )}
        <div className="header-stat strength-badge">
          ⚡ {networkStrength}x
        </div>
        <div className="header-stat" style={{ color: pythonOk ? 'var(--neon-green)' : 'var(--text-dim)' }}>
          🐍 {pythonOk ? 'Python OK' : 'Python offline'}
        </div>
      </div>

      <div className="header-actions">
        <button className="btn btn-primary" onClick={onNewAgent}>+ New Agent</button>
      </div>
    </header>
  );
}
