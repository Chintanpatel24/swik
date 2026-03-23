import { useState, useRef } from 'react';

// SVG avatar characters — each role has a distinct look
const AVATARS = {
  boss: ({ color }) => (
    <svg width="56" height="64" viewBox="0 0 56 64">
      {/* Chair */}
      <rect x="12" y="48" width="32" height="5" rx="2" fill="#2a2a3e"/>
      <rect x="18" y="52" width="4" height="10" fill="#2a2a3e"/>
      <rect x="34" y="52" width="4" height="10" fill="#2a2a3e"/>
      {/* Body */}
      <rect x="16" y="32" width="24" height="20" rx="4" fill={color}/>
      {/* Tie */}
      <polygon points="28,34 25,44 28,46 31,44" fill="#fff" opacity="0.9"/>
      {/* Head */}
      <circle cx="28" cy="22" r="12" fill="#f5c5a3"/>
      {/* Hair */}
      <rect x="16" y="12" width="24" height="8" rx="4" fill="#2a1a0a"/>
      {/* Eyes */}
      <circle cx="23" cy="21" r="2" fill="#2a1a0a"/>
      <circle cx="33" cy="21" r="2" fill="#2a1a0a"/>
      {/* Smile */}
      <path d="M23 27 Q28 31 33 27" stroke="#2a1a0a" strokeWidth="1.5" fill="none"/>
    </svg>
  ),
  dev: ({ color, status }) => (
    <svg width="56" height="64" viewBox="0 0 56 64">
      {/* Desk/monitor */}
      <rect x="4"  y="38" width="48" height="3" rx="1" fill="#1a1a2e"/>
      <rect x="12" y="20" width="32" height="22" rx="3" fill="#0d1117"/>
      <rect x="14" y="22" width="28" height="16" fill={status === 'working' ? '#0f4' : '#111'} opacity="0.9"/>
      {/* Code lines on screen */}
      {status === 'working' && <>
        <rect x="16" y="24" width="14" height="2" rx="1" fill="#4fc3f7" opacity="0.8"/>
        <rect x="16" y="28" width="20" height="2" rx="1" fill="#a5d6a7" opacity="0.8"/>
        <rect x="18" y="32" width="16" height="2" rx="1" fill="#fff59d" opacity="0.8"/>
      </>}
      {/* Person head */}
      <circle cx="28" cy="52" r="8" fill="#f5c5a3"/>
      <rect x="20" y="44" width="16" height="6" rx="3" fill="#1a1a5e"/>
      {/* Glasses */}
      <rect x="22" y="51" width="5" height="3" rx="1" fill="none" stroke={color} strokeWidth="1"/>
      <rect x="29" y="51" width="5" height="3" rx="1" fill="none" stroke={color} strokeWidth="1"/>
      <line x1="27" y1="52.5" x2="29" y2="52.5" stroke={color} strokeWidth="1"/>
    </svg>
  ),
  designer: ({ color, status }) => (
    <svg width="56" height="64" viewBox="0 0 56 64">
      {/* Drawing tablet */}
      <rect x="8" y="36" width="40" height="28" rx="4" fill="#1a1a2e"/>
      <rect x="10" y="38" width="36" height="22" rx="2" fill={status === 'working' ? '#1a0a2e' : '#111'}/>
      {/* Colorful design on tablet */}
      {status === 'working' && <>
        <circle cx="24" cy="49" r="6" fill={color} opacity="0.5"/>
        <rect x="30" y="43" width="12" height="12" rx="2" fill="#4ff" opacity="0.4"/>
      </>}
      {/* Stylus */}
      <line x1="44" y1="36" x2="48" y2="26" stroke="#ccc" strokeWidth="2"/>
      <polygon points="48,26 46,24 50,22" fill={color}/>
      {/* Head */}
      <circle cx="20" cy="22" r="10" fill="#f5c5a3"/>
      <path d="M10 18 Q20 10 30 18" fill="#6a1a6a"/>
      {/* Eyes */}
      <circle cx="16" cy="22" r="1.5" fill="#2a1a0a"/>
      <circle cx="24" cy="22" r="1.5" fill="#2a1a0a"/>
      {/* Earring */}
      <circle cx="10" cy="24" r="2" fill={color}/>
    </svg>
  ),
  researcher: ({ color, status }) => (
    <svg width="56" height="64" viewBox="0 0 56 64">
      {/* Papers / browser */}
      <rect x="6"  y="30" width="44" height="32" rx="3" fill="#0d1117"/>
      <rect x="8"  y="32" width="40" height="28" fill={status === 'searching' ? '#0a2a1a' : '#111'}/>
      {status === 'searching' && <>
        <circle cx="26" cy="46" r="7" fill="none" stroke={color} strokeWidth="2"/>
        <line x1="31" y1="51" x2="36" y2="56" stroke={color} strokeWidth="2.5"/>
        <rect x="12" y="33" width="20" height="2" rx="1" fill="#4fc3f7" opacity="0.6"/>
      </>}
      {/* Head */}
      <circle cx="28" cy="16" r="10" fill="#d4a574"/>
      <rect x="18" y="8" width="20" height="6" rx="3" fill="#2a1a0a"/>
      {/* Eyes */}
      <circle cx="24" cy="17" r="2" fill="#2a1a0a"/>
      <circle cx="32" cy="17" r="2" fill="#2a1a0a"/>
      {/* Magnifier badge */}
      <circle cx="42" cy="26" r="6" fill={color} opacity="0.8"/>
      <text x="39" y="29" fontSize="7" fill="white">🔍</text>
    </svg>
  ),
  writer: ({ color, status }) => (
    <svg width="56" height="64" viewBox="0 0 56 64">
      {/* Notebook */}
      <rect x="8" y="28" width="40" height="34" rx="3" fill="#fffde7"/>
      <rect x="8" y="28" width="4"  height="34" rx="2" fill={color}/>
      {status === 'working' ? <>
        <rect x="14" y="33" width="28" height="2" rx="1" fill="#9e9e9e"/>
        <rect x="14" y="38" width="24" height="2" rx="1" fill="#9e9e9e"/>
        <rect x="14" y="43" width="26" height="2" rx="1" fill="#9e9e9e"/>
        <rect x="14" y="48" width="18" height="2" rx="1" fill="#9e9e9e"/>
      </> : <>
        <rect x="14" y="36" width="28" height="2" rx="1" fill="#e0e0e0"/>
        <rect x="14" y="42" width="22" height="2" rx="1" fill="#e0e0e0"/>
      </>}
      {/* Pen */}
      <rect x="46" y="30" width="4" height="20" rx="2" fill="#ffd700" transform="rotate(-20,46,30)"/>
      {/* Head */}
      <circle cx="22" cy="16" r="10" fill="#f5c5a3"/>
      <path d="M12 12 Q22 4 32 12 L32 16 Q22 12 12 16 Z" fill="#8b4513"/>
      <circle cx="18" cy="17" r="1.5" fill="#2a1a0a"/>
      <circle cx="26" cy="17" r="1.5" fill="#2a1a0a"/>
    </svg>
  )
};

const DEFAULT_AVATAR = ({ color }) => (
  <svg width="56" height="64" viewBox="0 0 56 64">
    <circle cx="28" cy="20" r="14" fill="#f5c5a3"/>
    <rect x="14" y="38" width="28" height="24" rx="6" fill={color}/>
    <circle cx="22" cy="19" r="2" fill="#2a1a0a"/>
    <circle cx="34" cy="19" r="2" fill="#2a1a0a"/>
    <path d="M22 26 Q28 30 34 26" stroke="#2a1a0a" strokeWidth="1.5" fill="none"/>
  </svg>
);

const STATUS_LABELS = {
  idle:      { label: '',          pulse: false },
  thinking:  { label: '💭 thinking',  pulse: true  },
  working:   { label: '⚙ working',    pulse: true  },
  searching: { label: '🔍 searching', pulse: true  },
  done:      { label: '✓ done',       pulse: false },
  error:     { label: '✗ error',      pulse: false }
};

export default function AgentDesk({ agent, status = {}, selected, onClick, onDragEnd }) {
  const dragRef    = useRef(null);
  const [drag, setDrag] = useState(null);

  const AvatarComp = AVATARS[agent.avatar] || DEFAULT_AVATAR;
  const st = STATUS_LABELS[status.status] || STATUS_LABELS.idle;

  function onMouseDown(e) {
    e.preventDefault();
    const startX = e.clientX - agent.desk_x;
    const startY = e.clientY - agent.desk_y;
    setDrag({ startX, startY });

    function onMove(me) {
      const nx = me.clientX - startX;
      const ny = me.clientY - startY;
      dragRef.current.style.transform = `translate(${nx}px,${ny}px)`;
      dragRef.current.style.left = '0px';
      dragRef.current.style.top  = '0px';
    }
    function onUp(me) {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      setDrag(null);
      const nx = me.clientX - startX;
      const ny = me.clientY - startY;
      dragRef.current.style.transform = '';
      onDragEnd && onDragEnd(agent.id, nx, ny);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  }

  return (
    <div
      ref={dragRef}
      className={`agent-desk ${selected ? 'selected' : ''} ${status.status || 'idle'}`}
      style={{ left: agent.desk_x, top: agent.desk_y, '--agent-color': agent.color }}
      onClick={() => onClick(agent)}
      onMouseDown={onMouseDown}
    >
      {/* Status badge */}
      {st.label && (
        <div className={`agent-status-badge ${st.pulse ? 'pulsing' : ''}`}>{st.label}</div>
      )}

      {/* Thought bubble if has message */}
      {status.message && status.status !== 'idle' && (
        <div className="agent-thought">{status.message.slice(0, 50)}</div>
      )}

      {/* Desk surface */}
      <div className="desk-surface">
        <div className="desk-avatar">
          <AvatarComp color={agent.color} status={status.status} />
        </div>
        <div className="desk-nameplate">
          <div className="agent-name">{agent.name}</div>
          <div className="agent-role">{agent.role}</div>
        </div>
      </div>

      {/* Color accent line */}
      <div className="desk-accent" style={{ background: agent.color }}/>
    </div>
  );
}
