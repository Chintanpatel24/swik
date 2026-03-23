import { useState, useRef } from 'react';
import AgentDesk from '../Agent/AgentDesk';

export default function OfficeCanvas({ agents, agentStatuses, messages, selectedAgent, onSelectAgent, onMoveAgent }) {
  const canvasRef = useRef(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const panStart = useRef(null);

  // Middle-mouse or space+drag to pan
  function onMouseDown(e) {
    if (e.button === 1 || e.altKey) {
      e.preventDefault();
      setPanning(true);
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  }
  function onMouseMove(e) {
    if (!panning) return;
    setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  }
  function onMouseUp() { setPanning(false); }

  // Get last message between two agents
  const getLastMsg = (a, b) => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if ((m.from_agent === a && m.to_agent === b) || (m.from_agent === b && m.to_agent === a)) {
        return m;
      }
    }
    return null;
  };

  // Draw lines between agents who recently communicated
  const recentMsgs = messages.slice(-20);
  const connections = [];
  const seen = new Set();
  for (const m of recentMsgs) {
    if (!m.to_agent || m.from_agent === 'user' || m.to_agent === 'user') continue;
    const key = [m.from_agent, m.to_agent].sort().join('-');
    if (!seen.has(key)) {
      seen.add(key);
      const from = agents.find(a => a.id === m.from_agent);
      const to   = agents.find(a => a.id === m.to_agent);
      if (from && to) connections.push({ from, to, msg: m });
    }
  }

  return (
    <div
      ref={canvasRef}
      className={`office-canvas ${panning ? 'panning' : ''}`}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Background grid */}
      <div className="office-grid" style={{ transform: `translate(${pan.x}px,${pan.y}px)` }}>

        {/* Room decorations */}
        <div className="office-room">
          <div className="room-label">⬡ AGENT OFFICE</div>
          {/* Water cooler */}
          <div className="decor water-cooler" style={{ left: 60, top: 60 }}>
            <div className="wc-bottle"/>
            <div className="wc-base"/>
          </div>
          {/* Plant */}
          <div className="decor plant" style={{ right: 80, top: 60 }}>🪴</div>
          {/* Clock */}
          <div className="decor clock" style={{ left: '50%', top: 20 }}>
            {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
          {/* Whiteboard */}
          <div className="decor whiteboard" style={{ right: 40, top: 140 }}>
            <div className="wb-text">TASKS</div>
          </div>
        </div>

        {/* Connection lines between talking agents */}
        <svg className="connections-svg">
          {connections.map(({ from, to, msg }, i) => {
            const fx = from.desk_x + 56, fy = from.desk_y + 40;
            const tx = to.desk_x   + 56, ty = to.desk_y   + 40;
            const mx = (fx + tx) / 2,    my = (fy + ty) / 2;
            return (
              <g key={i}>
                <line
                  x1={fx} y1={fy} x2={tx} y2={ty}
                  stroke={from.color || '#4f8ef7'}
                  strokeWidth="1.5"
                  strokeDasharray="6,4"
                  opacity="0.5"
                />
                <circle cx={mx} cy={my} r="4" fill={from.color || '#4f8ef7'} opacity="0.7"/>
              </g>
            );
          })}
        </svg>

        {/* Agent desks */}
        {agents.map(agent => (
          <AgentDesk
            key={agent.id}
            agent={agent}
            status={agentStatuses[agent.id] || {}}
            selected={selectedAgent?.id === agent.id}
            onClick={onSelectAgent}
            onDragEnd={(id, x, y) => onMoveAgent(id, x, y)}
          />
        ))}
      </div>

      {/* Pan hint */}
      <div className="canvas-hint">Alt+drag to pan · Click agent to interact</div>
    </div>
  );
}
