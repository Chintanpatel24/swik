import { useState } from 'react';

const STATUS_META = {
  pending:  { icon: '◷', color: '#888',    label: 'Pending' },
  running:  { icon: '⚡', color: '#f7c94f', label: 'Running' },
  done:     { icon: '✓',  color: '#4ff7c4', label: 'Done'    },
  error:    { icon: '✗',  color: '#f74f4f', label: 'Error'   }
};

export default function TaskPanel({ tasks, agents, onDeleteTask }) {
  const [expanded, setExpanded] = useState(null);

  const getAgent = (id) => agents.find(a => a.id === id);

  return (
    <div className="task-panel">
      <div className="task-panel-header">
        <span className="panel-section-title">⚡ TASKS</span>
        <span className="panel-badge">{tasks.length}</span>
      </div>

      <div className="task-list">
        {tasks.length === 0 ? (
          <div className="task-empty">No tasks yet — use the Chat panel to dispatch work</div>
        ) : (
          tasks.map(task => {
            const meta    = STATUS_META[task.status] || STATUS_META.pending;
            const assignee= getAgent(task.assigned_to);
            const isOpen  = expanded === task.id;

            return (
              <div key={task.id} className={`task-card ${task.status}`}>
                <div className="task-card-header" onClick={() => setExpanded(isOpen ? null : task.id)}>
                  <span className="task-status-icon" style={{ color: meta.color }}>{meta.icon}</span>
                  <span className="task-title">{task.title}</span>
                  <div className="task-card-actions">
                    {assignee && (
                      <span className="task-assignee" style={{ background: assignee.color + '33', color: assignee.color }}>
                        {assignee.name}
                      </span>
                    )}
                    <button className="task-delete-btn" onClick={e => { e.stopPropagation(); onDeleteTask(task.id); }}>✕</button>
                    <span className="task-chevron">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isOpen && (
                  <div className="task-card-body">
                    <div className="task-desc">{task.description}</div>
                    {task.result && (
                      <div className="task-result">
                        <div className="task-result-label">RESULT</div>
                        <div className="task-result-text">{task.result}</div>
                      </div>
                    )}
                    <div className="task-meta-row">
                      <span className="task-status-badge" style={{ color: meta.color, borderColor: meta.color }}>
                        {meta.label}
                      </span>
                      <span className="task-date">
                        {new Date(task.created_at * 1000).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
