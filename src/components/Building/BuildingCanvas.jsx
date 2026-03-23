import { useEffect, useRef, useState } from 'react';
import { SceneManager } from '../../three/SceneManager.js';

const STATUS_META = {
  idle:      { label: null,                color: '#fff' },
  thinking:  { label: '💭 thinking',       color: '#f7c94f' },
  working:   { label: '⚙ working',         color: '#4ff7c4' },
  searching: { label: '🔍 searching',      color: '#4f8ef7' },
  talking:   { label: '💬 talking',        color: '#c44ff7' },
  done:      { label: '✓ done',            color: '#4ff7c4' },
  error:     { label: '✗ error',           color: '#f74f4f' },
};

function Bubble({ agent, pos, status, selected, hovered }) {
  if (!pos) return null;
  const meta    = STATUS_META[status?.status] || STATUS_META.idle;
  const visible = selected || hovered || (status?.status && status.status !== 'idle');
  if (!visible) return null;

  return (
    <div className="hq-bubble" style={{ left: pos.x, top: pos.y }}>
      <div className="hq-bubble-inner" style={{ borderLeftColor: agent.color }}>
        <span className="hq-b-dot"  style={{ background: agent.color }}/>
        <span className="hq-b-name">{agent.name}</span>
        <span className="hq-b-floor">F{agent.floor}</span>
        {meta.label && <>
          <span className="hq-b-sep">·</span>
          <span className="hq-b-status" style={{ color: meta.color }}>{meta.label}</span>
        </>}
      </div>
    </div>
  );
}

export default function BuildingCanvas({ agents, agentStatus, messages, selectedAgent, onSelectAgent }) {
  const containerRef = useRef(null);
  const managerRef   = useRef(null);
  const spawnedRef   = useRef(new Set());
  const cbsRef       = useRef({});

  const [loaded,     setLoaded]     = useState(false);
  const [bubblePos,  setBubblePos]  = useState({});
  const [hoveredId,  setHoveredId]  = useState(null);

  cbsRef.current = { onSelectAgent, setHoveredId, setBubblePos };

  // Mount once
  useEffect(() => {
    if (!containerRef.current) return;
    const mgr = new SceneManager(containerRef.current, {
      onLoaded:           ()  => setLoaded(true),
      onSelect:           id  => cbsRef.current.onSelectAgent(id),
      onHover:            id  => cbsRef.current.setHoveredId(id),
      onBubblePositions:  pos => cbsRef.current.setBubblePos(pos),
    });
    managerRef.current = mgr;
    return () => { mgr.dispose(); managerRef.current = null; spawnedRef.current = new Set(); setLoaded(false); };
  }, []);

  // Sync agents
  useEffect(() => {
    const mgr = managerRef.current;
    if (!mgr || !loaded) return;
    const ids = new Set(agents.map(a => a.id));
    agents.forEach((a, idx) => {
      if (!spawnedRef.current.has(a.id)) {
        mgr.addAgent(a.id, a.color, a.floor || 1, a.desk_index ?? idx);
        spawnedRef.current.add(a.id);
      }
    });
    for (const id of [...spawnedRef.current]) {
      if (!ids.has(id)) { mgr.removeAgent(id); spawnedRef.current.delete(id); }
    }
  }, [agents, loaded]);

  // Sync statuses → animations
  useEffect(() => {
    const mgr = managerRef.current;
    if (!mgr || !loaded) return;
    for (const [id, st] of Object.entries(agentStatus)) mgr.setStatus(id, st.status || 'idle');
  }, [agentStatus, loaded]);

  // Camera follow
  useEffect(() => {
    const mgr = managerRef.current;
    if (!mgr) return;
    if (selectedAgent) mgr.focusAgent(selectedAgent.id);
    else               mgr.clearFocus();
  }, [selectedAgent]);

  return (
    <div className="building-canvas" ref={containerRef}>
      {!loaded && (
        <div className="building-loading">
          <div className="bl-spinner"/>
          <span>LOADING HQ</span>
        </div>
      )}

      <div className="bubble-layer">
        {agents.map(a => (
          <Bubble
            key={a.id}
            agent={a}
            pos={bubblePos[a.id]}
            status={agentStatus[a.id]}
            selected={selectedAgent?.id === a.id}
            hovered={hoveredId === a.id}
          />
        ))}
      </div>

      {/* Floor legend */}
      {loaded && (
        <div className="floor-legend">
          {[3, 2, 1].map(fl => {
            const flAgents = agents.filter(a => a.floor === fl);
            const colors   = ['#f7c94f','#f74faa','#4f8ef7'];
            return (
              <div key={fl} className="floor-leg-row">
                <span className="floor-leg-dot" style={{ background: colors[fl - 1] }}/>
                <span className="floor-leg-label">F{fl} — {flAgents.length ? flAgents.map(a => a.name).join(', ') : '(empty)'}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="canvas-hint">Drag to orbit · Scroll to zoom · Click agent</div>
    </div>
  );
}
