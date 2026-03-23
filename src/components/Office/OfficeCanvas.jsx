import { useEffect, useRef, useState } from 'react';
import { SceneManager } from '../../three/SceneManager.js';

const STATUS_META = {
  idle:      { label: null,                  color: '#ffffff' },
  thinking:  { label: '💭 thinking...',      color: '#f7c94f' },
  working:   { label: '⚙ working',          color: '#4ff7c4' },
  searching: { label: '🔍 searching web',   color: '#4f8ef7' },
  talking:   { label: '💬 talking',          color: '#c44ff7' },
  done:      { label: '✓ done',              color: '#4ff7c4' },
  error:     { label: '✗ error',             color: '#f74f4f' },
};

function AgentBubble({ agent, pos, status, selected, hovered }) {
  if (!pos) return null;
  const meta    = STATUS_META[status?.status] || STATUS_META.idle;
  const visible = selected || hovered || (status?.status && status.status !== 'idle');
  if (!visible) return null;

  return (
    <div className="agent-bubble" style={{ left: pos.x, top: pos.y }}>
      <div className="agent-bubble-inner" style={{ borderLeftColor: agent.color }}>
        <span className="bubble-dot" style={{ background: agent.color }} />
        <span className="bubble-name">{agent.name}</span>
        {meta.label && (
          <>
            <span className="bubble-sep">·</span>
            <span className="bubble-status" style={{ color: meta.color }}>{meta.label}</span>
          </>
        )}
      </div>
    </div>
  );
}

export default function OfficeCanvas({ agents, agentStatuses, messages, selectedAgent, onSelectAgent }) {
  const containerRef = useRef(null);
  const managerRef   = useRef(null);
  const spawnedRef   = useRef(new Set());
  const callbacksRef = useRef({});   // mutable ref so SceneManager never has stale closures

  const [loaded,          setLoaded]          = useState(false);
  const [screenPositions, setScreenPositions] = useState({});
  const [hoveredId,       setHoveredId]       = useState(null);

  // Keep callbacks ref fresh every render
  callbacksRef.current = {
    onSelectAgent,
    onHoverAgent:           setHoveredId,
    onScreenPositionsUpdate: setScreenPositions,
  };

  // ── Mount scene once ──────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const mgr = new SceneManager(containerRef.current, {
      onSelectAgent:           (id) => callbacksRef.current.onSelectAgent(id),
      onHoverAgent:            (id) => callbacksRef.current.onHoverAgent(id),
      onScreenPositionsUpdate: (p)  => callbacksRef.current.onScreenPositionsUpdate(p),
      onLoaded:                ()   => setLoaded(true),
    });
    managerRef.current = mgr;

    return () => {
      mgr.dispose();
      managerRef.current = null;
      spawnedRef.current = new Set();
      setLoaded(false);
    };
  }, []); // run once

  // ── Sync agents into 3D scene ─────────────────────────────────
  useEffect(() => {
    const mgr = managerRef.current;
    if (!mgr || !loaded) return;

    const currentIds = new Set(agents.map(a => a.id));

    // Spawn new agents
    agents.forEach((agent, idx) => {
      if (!spawnedRef.current.has(agent.id)) {
        mgr.addAgent(agent.id, agent.color, idx);
        spawnedRef.current.add(agent.id);
      }
    });

    // Remove deleted agents
    for (const id of [...spawnedRef.current]) {
      if (!currentIds.has(id)) {
        mgr.removeAgent(id);
        spawnedRef.current.delete(id);
      }
    }
  }, [agents, loaded]);

  // ── Sync statuses → animations ───────────────────────────────
  useEffect(() => {
    const mgr = managerRef.current;
    if (!mgr || !loaded) return;
    for (const [id, st] of Object.entries(agentStatuses)) {
      mgr.setAgentStatus(id, st.status || 'idle');
    }
  }, [agentStatuses, loaded]);

  // ── Camera follow selected agent ─────────────────────────────
  useEffect(() => {
    const mgr = managerRef.current;
    if (!mgr) return;
    if (selectedAgent) mgr.focusAgent(selectedAgent.id);
    else               mgr.clearFocus();
  }, [selectedAgent]);

  return (
    <div className="office-3d-wrap" ref={containerRef}>
      {!loaded && (
        <div className="office-loading">
          <div className="loading-spinner" />
          <span>LOADING OFFICE</span>
        </div>
      )}

      {/* Screen-space React overlay */}
      <div className="overlay-layer" style={{ pointerEvents: 'none' }}>
        {agents.map(agent => (
          <AgentBubble
            key={agent.id}
            agent={agent}
            pos={screenPositions[agent.id]}
            status={agentStatuses[agent.id]}
            selected={selectedAgent?.id === agent.id}
            hovered={hoveredId === agent.id}
          />
        ))}
      </div>

      <div className="canvas-hint">Drag to orbit · Scroll to zoom · Click agent to select</div>
    </div>
  );
}
