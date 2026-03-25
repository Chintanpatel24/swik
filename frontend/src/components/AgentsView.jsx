function parseSkills(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

export default function AgentsView({ agents, agentStatus, onEditAgent, onDeleteAgent, onNewAgent, onChatAgent }) {
  const totalStrength = agents.reduce((s, a) => s * Math.max(1, a.strength || 1), 1);

  return (
    <div className="agents-view">
      <div className="agents-view-header">
        <div className="agents-view-title font-display">
          Agent Network
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {agents.length > 0 && (
            <div className="strength-badge" style={{ fontSize: 13 }}>
              ⚡ Network strength: {totalStrength}x
            </div>
          )}
          <button className="btn btn-primary" onClick={onNewAgent}>+ New Agent</button>
        </div>
      </div>

      {agents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⬡</div>
          <div className="empty-state-title">No Agents Yet</div>
          <div className="empty-state-desc">
            Create your first AI agent. Each agent has its own personality, skills, and LLM provider.
            Agents collaborate to multiply their strength.
          </div>
          <button className="btn btn-primary" onClick={onNewAgent}>Create First Agent</button>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {agents.length} agent{agents.length !== 1 ? 's' : ''} · Combined network strength: <span className="strength-badge">⚡{totalStrength}x</span> · Strength multiplies with each added agent (MiroFish model)
          </div>
          <div className="agents-grid">
            {agents.map(agent => <AgentCard key={agent.id} agent={agent} status={agentStatus[agent.id]} onEdit={onEditAgent} onDelete={onDeleteAgent} onChat={onChatAgent} />)}
          </div>
        </>
      )}
    </div>
  );
}

function AgentCard({ agent, status, onEdit, onDelete, onChat }) {
  const skills = parseSkills(agent.skills);
  const st = status || {};
  const isWorking = ['working', 'thinking', 'searching'].includes(st.status);
  const strengthStars = '⚡'.repeat(Math.min(agent.strength || 1, 5));

  return (
    <div
      className="agent-big-card"
      style={{ '--agent-color': agent.color || 'var(--neon-cyan)' }}
      onClick={() => onChat(agent)}
    >
      <div className="agent-big-card-top">
        <div className="agent-big-avatar" style={{ background: (agent.color || '#00ff88') + '22' }}>
          {agent.avatar || '🤖'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="agent-big-name" style={{ color: agent.color || 'var(--text-primary)' }}>
            {agent.name}
          </div>
          <div className="agent-big-role">{agent.role}</div>
        </div>
        {isWorking && <div className="spinner" />}
      </div>

      {agent.system_prompt && (
        <div className="agent-big-prompt">{agent.system_prompt}</div>
      )}

      {skills.length > 0 && (
        <div className="agent-big-skills">
          {skills.map(s => <span key={s} className="skill-chip">{s}</span>)}
        </div>
      )}

      <div className="agent-big-footer">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ color: 'var(--text-dim)', fontSize: 10 }}>{agent.provider} · {agent.model}</div>
          <div className="agent-big-strength">{strengthStars} {agent.strength || 1}x</div>
        </div>
        <div className="agent-big-actions">
          <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); onEdit(agent); }}>Edit</button>
          <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); onDelete(agent.id); }}>Del</button>
        </div>
      </div>

      {isWorking && (
        <div style={{ marginTop: 10, fontSize: 10, color: 'var(--neon-cyan)' }}>
          ▶ {st.message || 'Working…'}
        </div>
      )}
    </div>
  );
}
