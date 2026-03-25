export default function Sidebar({ agents, agentStatus, selectedAgent, onSelectAgent, onEditAgent, onDeleteAgent, onNewAgent, pythonStatus }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Agents ({agents.length})</span>
      </div>

      <div className="sidebar-agents">
        {agents.length === 0 && (
          <div style={{ padding: '20px 10px', color: 'var(--text-dim)', fontSize: 11, textAlign: 'center' }}>
            No agents yet.<br />Create your first agent.
          </div>
        )}
        {agents.map(agent => {
          const st = agentStatus[agent.id] || {};
          const isWorking = ['working','thinking','searching'].includes(st.status);
          const skills = parseSkills(agent.skills);
          return (
            <div
              key={agent.id}
              className={`agent-card ${selectedAgent?.id === agent.id ? 'selected' : ''} ${isWorking ? 'working' : ''}`}
              onClick={() => onSelectAgent(agent)}
            >
              <div className="agent-avatar" style={{ background: (agent.color || '#00ff88') + '22', border: `1px solid ${agent.color || '#00ff88'}44` }}>
                {agent.avatar || '🤖'}
                <div className={`agent-avatar-dot ${isWorking ? 'working' : st.status === 'idle' ? 'online' : 'offline'}`} style={{ background: agent.color || 'var(--neon-green)' }} />
              </div>
              <div className="agent-info">
                <div className="agent-name" style={{ color: agent.color || 'var(--text-primary)' }}>{agent.name}</div>
                <div className="agent-role">{agent.role}</div>
                {st.message && <div className="agent-status-msg">{st.message}</div>}
                {!st.message && skills.length > 0 && (
                  <div className="agent-role" style={{ color: 'var(--text-dim)' }}>{skills.slice(0,2).join(' · ')}</div>
                )}
              </div>
              <div className="agent-actions">
                <button className="btn btn-icon btn-ghost btn-sm" onClick={e => { e.stopPropagation(); onEditAgent(agent); }} title="Edit">✎</button>
                <button className="btn btn-icon btn-danger btn-sm" onClick={e => { e.stopPropagation(); onDeleteAgent(agent.id); }} title="Delete">✕</button>
              </div>
            </div>
          );
        })}
      </div>

      <button className="sidebar-add-btn" onClick={onNewAgent}>
        + Add Agent
      </button>

      <div className="sidebar-python">
        <div className="python-status">
          <span className={`status-dot ${pythonStatus?.ok ? 'online' : 'offline'}`} />
          <span>Python: {pythonStatus?.ok ? `${pythonStatus.user_agents || 0} agents` : 'offline'}</span>
        </div>
      </div>
    </aside>
  );
}

function parseSkills(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}
