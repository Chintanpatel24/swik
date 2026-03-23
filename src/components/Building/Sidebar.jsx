const FLOOR_COLORS = { 1: '#4f8ef7', 2: '#f74faa', 3: '#f7c94f' };
const FLOOR_NAMES  = { 1: 'Ground Floor', 2: 'Mid Floor', 3: 'Penthouse' };

const STATUS_COLOR = {
  thinking: '#f7c94f', working: '#4ff7c4', searching: '#4f8ef7',
  talking: '#c44ff7', done: '#4ff7c4', error: '#f74f4f',
};

export default function Sidebar({ agents, agentStatus, selectedAgent, onSelectAgent, onNewAgent, onEditAgent }) {
  const floors = [3, 2, 1];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">PERSONNEL</span>
        <span className="sidebar-count">{agents.length}</span>
      </div>

      <div className="sidebar-body">
        {floors.map(fl => {
          const flAgents = agents.filter(a => (a.floor || 1) === fl);
          return (
            <div key={fl} className="floor-group">
              <div className="floor-group-header">
                <span className="floor-dot" style={{ background: FLOOR_COLORS[fl] }}/>
                <span className="floor-group-label">FLOOR {fl}</span>
                <span className="floor-group-name">{FLOOR_NAMES[fl]}</span>
                <span className="floor-group-count">{flAgents.length}</span>
              </div>

              {flAgents.map(agent => {
                const st         = agentStatus[agent.id] || {};
                const isActive   = st.status && st.status !== 'idle';
                const isSelected = selectedAgent?.id === agent.id;
                const dotColor   = isActive ? (STATUS_COLOR[st.status] || agent.color) : '#252540';

                return (
                  <div key={agent.id} className={`sidebar-agent ${isSelected ? 'selected' : ''}`}>
                    <button className="sa-main" onClick={() => onSelectAgent(isSelected ? null : agent)}>
                      <span className="sa-dot" style={{ background: dotColor, boxShadow: isActive ? `0 0 6px ${dotColor}` : 'none' }}/>
                      <span className="sa-name">{agent.name}</span>
                      <span className="sa-role">{agent.role}</span>
                      {isActive && <span className="sa-pulse"/>}
                    </button>
                    <button className="sa-edit" onClick={() => onEditAgent(agent)} title="Edit">✎</button>
                  </div>
                );
              })}

              {flAgents.length === 0 && (
                <div className="floor-empty">— vacant —</div>
              )}
            </div>
          );
        })}
      </div>

      <button className="sidebar-add" onClick={onNewAgent}>+ ADD AGENT</button>
    </div>
  );
}
