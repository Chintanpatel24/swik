export default function Sidebar({ agents, agentStatuses, selectedAgent, onSelectAgent, onNewAgent, onEditAgent }) {
  const roles = [...new Set(agents.map(a => a.role))].sort();

  const STATUS_COLOR = {
    thinking:  '#f7c94f',
    working:   '#4ff7c4',
    searching: '#4f8ef7',
    talking:   '#c44ff7',
    done:      '#4ff7c4',
    error:     '#f74f4f',
    idle:      null,
  };

  return (
    <div className="sidebar">
      <div className="sidebar-top">
        <span className="sidebar-section-title">TEAM</span>
        <span className="sidebar-count">{agents.length}</span>
      </div>

      <div className="sidebar-agents">
        {agents.length === 0 && (
          <div className="sidebar-empty">No agents yet</div>
        )}

        {roles.map(role => (
          <div key={role} className="sidebar-group">
            <div className="sidebar-role-label">{role.toUpperCase()}</div>
            {agents.filter(a => a.role === role).map(agent => {
              const st        = agentStatuses[agent.id] || {};
              const isActive  = st.status && st.status !== 'idle';
              const isSelected= selectedAgent?.id === agent.id;
              const dotColor  = isActive ? (STATUS_COLOR[st.status] || agent.color) : '#2a2a4a';

              return (
                <div
                  key={agent.id}
                  className={`sidebar-agent ${isSelected ? 'selected' : ''}`}
                >
                  <button
                    className="sidebar-agent-main"
                    onClick={() => onSelectAgent(isSelected ? null : agent)}
                  >
                    <span
                      className="sidebar-dot"
                      style={{
                        background: dotColor,
                        boxShadow: isActive ? `0 0 7px ${dotColor}` : 'none',
                      }}
                    />
                    <span className="sidebar-name">{agent.name}</span>
                    {isActive && (
                      <span className="sidebar-status-dot"/>
                    )}
                  </button>
                  <button
                    className="sidebar-edit-btn"
                    onClick={() => onEditAgent(agent)}
                    title={`Edit ${agent.name}`}
                  >✎</button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <button className="sidebar-new-agent" onClick={onNewAgent}>
        + ADD AGENT
      </button>
    </div>
  );
}
