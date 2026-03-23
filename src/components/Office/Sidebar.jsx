export default function Sidebar({ agents, agentStatuses, selectedAgent, onSelectAgent, onNewAgent }) {
  const roles = [...new Set(agents.map(a => a.role))];

  return (
    <div className="sidebar">
      <div className="sidebar-section-title">TEAM</div>

      {agents.length === 0 ? (
        <div className="sidebar-empty">No agents yet</div>
      ) : (
        roles.map(role => (
          <div key={role} className="sidebar-group">
            <div className="sidebar-role-label">{role.toUpperCase()}</div>
            {agents.filter(a => a.role === role).map(agent => {
              const st = agentStatuses[agent.id] || {};
              const isActive  = st.status && st.status !== 'idle';
              const isSelected= selectedAgent?.id === agent.id;

              return (
                <button
                  key={agent.id}
                  className={`sidebar-agent ${isSelected ? 'selected' : ''} ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectAgent(agent)}
                >
                  <span className="sidebar-dot" style={{
                    background: isActive ? agent.color : '#333',
                    boxShadow: isActive ? `0 0 6px ${agent.color}` : 'none'
                  }}/>
                  <span className="sidebar-name">{agent.name}</span>
                  {isActive && <span className="sidebar-status">{st.status}</span>}
                </button>
              );
            })}
          </div>
        ))
      )}

      <button className="sidebar-new-agent" onClick={onNewAgent}>+ NEW AGENT</button>
    </div>
  );
}
