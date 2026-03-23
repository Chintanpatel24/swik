import { useState, useEffect } from 'react';

// ── Task Panel ────────────────────────────────────────────────
const S = { pending:'◷',running:'⚡',done:'✓',error:'✗' };
const SC= { pending:'#555',running:'#f7c94f',done:'#4ff7c4',error:'#f74f4f' };

export function TaskPanel({ tasks, agents, onDeleteTask }) {
  const [open, setOpen] = useState(null);
  const agent = id => agents.find(a => a.id === id);

  return (
    <div className="task-panel">
      <div className="task-header">
        <span className="f-section-title">⚡ TASKS</span>
        <span className="badge">{tasks.length}</span>
      </div>
      <div className="task-list">
        {tasks.length === 0 && <div className="empty-msg">No tasks — dispatch one from Chat</div>}
        {tasks.map(t => {
          const a = agent(t.assigned_to);
          return (
            <div key={t.id} className={`task-card task-${t.status}`}>
              <div className="task-card-top" onClick={()=>setOpen(open===t.id?null:t.id)}>
                <span className="task-icon" style={{color:SC[t.status]||'#555'}}>{S[t.status]||'·'}</span>
                <span className="task-title">{t.title}</span>
                <div className="task-actions">
                  {a && <span className="task-agent" style={{background:a.color+'22',color:a.color}}>{a.name}</span>}
                  <button className="task-del" onClick={e=>{e.stopPropagation();onDeleteTask(t.id);}}>✕</button>
                  <span className="task-chev">{open===t.id?'▲':'▼'}</span>
                </div>
              </div>
              {open===t.id && (
                <div className="task-body">
                  <p className="task-desc">{t.description}</p>
                  {t.result && (
                    <div className="task-result">
                      <div className="task-result-label">RESULT</div>
                      <pre className="task-result-text">{t.result}</pre>
                    </div>
                  )}
                  <div className="task-meta">
                    <span className="task-status-badge" style={{color:SC[t.status],borderColor:SC[t.status]}}>{t.status}</span>
                    <span className="task-date">{new Date(t.created_at*1000).toLocaleString('en-IN',{dateStyle:'short',timeStyle:'short'})}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Workspace Panel ───────────────────────────────────────────
export function WorkspacePanel({ agent, getWorkspace, getFile }) {
  const [files,   setFiles]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(null);  // {path,content}
  const [taskId,  setTaskId]  = useState('general');

  useEffect(() => { if (agent) refresh(); else setFiles([]); }, [agent, taskId]);

  async function refresh() {
    if (!agent) return;
    setLoading(true);
    try { const r = await getWorkspace(agent.id, taskId); setFiles(r.files||[]); } catch { setFiles([]); }
    setLoading(false);
  }

  async function readFile(fp) {
    if (!agent) return;
    const r = await getFile(agent.id, taskId, fp);
    setOpen({ path: fp, content: r.content || '(empty)' });
  }

  if (!agent) return <div className="ws-empty">Select an agent to browse their workspace files</div>;

  return (
    <div className="ws-panel">
      <div className="ws-header">
        <span style={{color:agent.color,fontWeight:700}}>{agent.name}</span>
        <span className="ws-title"> WORKSPACE</span>
        <button className="ws-refresh" onClick={refresh}>↺</button>
      </div>
      <div className="ws-taskbar">
        <span className="f-label" style={{fontSize:9}}>CONTEXT:</span>
        <input className="f-input ws-tid-input" value={taskId} onChange={e=>setTaskId(e.target.value||'general')} placeholder="general"/>
      </div>

      {open ? (
        <div className="ws-fileview">
          <div className="ws-filetop">
            <button className="btn-ghost" onClick={()=>setOpen(null)}>← BACK</button>
            <span className="ws-filepath">{open.path}</span>
            <button className="btn-ghost" onClick={()=>navigator.clipboard?.writeText(open.content)}>⎘ COPY</button>
          </div>
          <pre className="ws-code">{open.content}</pre>
        </div>
      ) : (
        <div className="ws-files">
          {loading && <div className="empty-msg">Loading…</div>}
          {!loading && files.length===0 && <div className="empty-msg">No files yet</div>}
          {files.map(f => (
            <button key={f.path} className={`ws-file ${f.isDir?'ws-dir':''}`} onClick={()=>!f.isDir&&readFile(f.path)}>
              <span className="ws-ficon">{f.isDir?'📁':'📄'}</span>
              <span className="ws-fname">{f.name}</span>
              {!f.isDir && <span className="ws-open">OPEN →</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
