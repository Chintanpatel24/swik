import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

function parseSkills(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

function parseAgentIds(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

export default function TasksView({ agents, tasks, messages, agentStatus, onCreateTask, onDeleteTask }) {
  const [title,       setTitle]       = useState('');
  const [description, setDesc]        = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [submitting,  setSubmitting]  = useState(false);
  const [expandedTask, setExpanded]   = useState(null);

  const toggleAgent = (id) => setSelectedIds(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const handleSubmit = async () => {
    if (!title.trim() || selectedIds.length === 0) return;
    setSubmitting(true);
    await onCreateTask({ title, description, agent_ids: selectedIds });
    setTitle(''); setDesc(''); setSelectedIds([]);
    setSubmitting(false);
  };

  const networkStrength = selectedIds.reduce((s, id) => {
    const a = agents.find(x => x.id === id);
    return s * Math.max(1, a?.strength || 1);
  }, 1);

  return (
    <div className="tasks-view">
      {/* Left: task form */}
      <div className="task-form-panel">
        <div className="panel" style={{ padding: 16, background: 'var(--bg-card)' }}>
          <h3 style={{ marginBottom: 14 }}>⬡ New Task</h3>

          <div className="form-group">
            <label>Task Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What do you need done?" />
          </div>

          <div className="form-group">
            <label>Description (optional)</label>
            <textarea value={description} onChange={e => setDesc(e.target.value)} placeholder="Additional context, requirements, constraints…" rows={3} />
          </div>

          <div className="form-group">
            <label>Assign Agents</label>
            <div className="agent-checkboxes">
              {agents.length === 0 ? (
                <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: 8 }}>No agents created yet</div>
              ) : agents.map(a => (
                <label key={a.id} className={`agent-checkbox ${selectedIds.includes(a.id) ? 'checked' : ''}`} style={{ cursor: 'pointer' }}>
                  <input type="checkbox" checked={selectedIds.includes(a.id)} onChange={() => toggleAgent(a.id)} />
                  <span style={{ fontSize: 16 }}>{a.avatar || '🤖'}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 700, color: a.color || 'var(--text-primary)' }}>{a.name}</span>
                    <span style={{ color: 'var(--text-dim)', marginLeft: 4, fontSize: 10 }}>{a.role}</span>
                  </span>
                  <span className="strength-badge" style={{ fontSize: 10 }}>⚡{a.strength || 1}</span>
                </label>
              ))}
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div style={{ padding: '8px 10px', background: 'rgba(255,230,0,0.06)', border: '1px solid rgba(255,230,0,0.15)', borderRadius: 4, marginBottom: 12, fontSize: 11 }}>
              <span className="strength-badge">⚡ Network strength: {networkStrength}x</span>
              <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>{selectedIds.length} agent{selectedIds.length > 1 ? 's' : ''} · multiplied</span>
            </div>
          )}

          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={!title.trim() || selectedIds.length === 0 || submitting}
            onClick={handleSubmit}
          >
            {submitting ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Running…</> : '▶ Run Task'}
          </button>
        </div>
      </div>

      {/* Right: task list */}
      <div className="task-list-panel">
        {tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">◉</div>
            <div className="empty-state-title">No Tasks Yet</div>
            <div className="empty-state-desc">Create a task and assign agents. They'll collaborate and synthesise a combined result.</div>
          </div>
        ) : tasks.map(task => (
          <TaskItem
            key={task.id}
            task={task}
            agents={agents}
            messages={messages.filter(m => m.task_id === task.id)}
            agentStatus={agentStatus}
            expanded={expandedTask === task.id}
            onToggle={() => setExpanded(x => x === task.id ? null : task.id)}
            onDelete={onDeleteTask}
          />
        ))}
      </div>
    </div>
  );
}

function TaskItem({ task, agents, messages, agentStatus, expanded, onToggle, onDelete }) {
  const taskAgentIds = parseAgentIds(task.agent_ids);
  const taskAgents   = taskAgentIds.map(id => agents.find(a => a.id === id)).filter(Boolean);

  return (
    <div className={`task-item ${task.status}`} onClick={onToggle}>
      <div className="task-item-header">
        <div className="task-item-title">{task.title}</div>
        <div className="task-status-tag" style={task.status === 'running' ? { display: 'flex', alignItems: 'center', gap: 5 } : {}}>
          {task.status === 'running' && <span className="spinner" style={{ width: 10, height: 10 }} />}
          {task.status}
        </div>
        <button className="btn btn-danger btn-sm btn-icon" onClick={e => { e.stopPropagation(); onDelete(task.id); }} title="Delete">✕</button>
      </div>

      {task.description && <div className="task-item-desc">{task.description}</div>}

      <div className="task-item-meta">
        {taskAgents.map(a => (
          <span key={a.id} style={{ color: a.color || 'var(--text-dim)' }}>{a.avatar || '🤖'} {a.name}</span>
        ))}
        <span style={{ marginLeft: 'auto' }}>
          {new Date(task.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {expanded && (
        <div onClick={e => e.stopPropagation()}>
          {/* Task messages log */}
          {messages.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6 }}>
                Agent Activity ({messages.length})
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {messages.map(m => {
                  const fromAgent = agents.find(a => a.id === m.from_agent);
                  return (
                    <div key={m.id} style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '4px 8px', background: 'var(--bg-deep)', borderRadius: 3, borderLeft: `2px solid ${fromAgent?.color || 'var(--border-glow)'}` }}>
                      <span style={{ fontWeight: 700, color: fromAgent?.color || 'var(--text-secondary)' }}>
                        {fromAgent?.name || m.from_agent}
                      </span>
                      {m.to_agent && m.to_agent !== 'user' && (
                        <span style={{ color: 'var(--text-dim)' }}> → {agents.find(a => a.id === m.to_agent)?.name || m.to_agent}</span>
                      )}
                      <span style={{ color: 'var(--text-dim)', marginLeft: 6, fontSize: 10 }}>[{m.type}]</span>
                      <div style={{ marginTop: 2, color: 'var(--text-secondary)' }}>{m.content.slice(0, 120)}{m.content.length > 120 ? '…' : ''}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Final result */}
          {task.result && (
            <div className="task-result">
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--neon-green)', marginBottom: 8 }}>
                ✓ Result
              </div>
              <div className="md-content" style={{ fontSize: 11 }}>
                <ReactMarkdown>{task.result}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
