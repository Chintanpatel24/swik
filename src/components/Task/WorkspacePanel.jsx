import { useState, useEffect } from 'react';

const LANG_MAP = {
  '.js': 'javascript', '.jsx': 'javascript', '.ts': 'typescript', '.tsx': 'typescript',
  '.py': 'python', '.md': 'markdown', '.html': 'html', '.css': 'css',
  '.json': 'json', '.sh': 'bash', '.txt': 'text',
};

function langFromPath(p) {
  const ext = '.' + p.split('.').pop();
  return LANG_MAP[ext] || 'text';
}

export default function WorkspacePanel({ agent, getWorkspace, getFile }) {
  const [files,      setFiles]    = useState([]);
  const [loading,    setLoading]  = useState(false);
  const [openFile,   setOpenFile] = useState(null);   // { path, content }
  const [fileLoading,setFLoading] = useState(false);
  const [taskId,     setTaskId]   = useState('general');

  useEffect(() => {
    if (!agent) { setFiles([]); return; }
    refresh();
  }, [agent, taskId]);

  async function refresh() {
    if (!agent) return;
    setLoading(true);
    try {
      const res = await getWorkspace(agent.id, taskId);
      setFiles(res.files || []);
    } catch { setFiles([]); }
    setLoading(false);
  }

  async function openFileContent(filePath) {
    if (!agent) return;
    setFLoading(true);
    try {
      const res = await getFile(agent.id, taskId, filePath);
      setOpenFile({ path: filePath, content: res.content || '' });
    } catch { setOpenFile({ path: filePath, content: '(error reading file)' }); }
    setFLoading(false);
  }

  if (!agent) {
    return (
      <div className="workspace-empty">
        <span>Select an agent to browse their workspace files</span>
      </div>
    );
  }

  return (
    <div className="workspace-panel">
      <div className="workspace-header">
        <span className="workspace-agent" style={{ color: agent.color }}>
          {agent.name}
        </span>
        <span className="workspace-title">WORKSPACE</span>
        <button className="ws-refresh" onClick={refresh} title="Refresh">↺</button>
      </div>

      <div className="workspace-taskbar">
        <span className="ws-label">CONTEXT:</span>
        <input
          className="ws-task-input"
          value={taskId}
          onChange={e => setTaskId(e.target.value || 'general')}
          placeholder="general"
        />
      </div>

      {openFile ? (
        <div className="ws-file-view">
          <div className="ws-file-topbar">
            <button className="ws-back" onClick={() => setOpenFile(null)}>← BACK</button>
            <span className="ws-filepath">{openFile.path}</span>
            <button
              className="ws-copy"
              onClick={() => navigator.clipboard?.writeText(openFile.content)}
              title="Copy"
            >⎘</button>
          </div>
          <pre className={`ws-code ws-${langFromPath(openFile.path)}`}>
            {openFile.content}
          </pre>
        </div>
      ) : (
        <div className="ws-file-list">
          {loading && <div className="ws-loading">Loading…</div>}

          {!loading && files.length === 0 && (
            <div className="ws-no-files">
              No files yet — assign a task to generate output
            </div>
          )}

          {files.map(f => (
            <button
              key={f.path}
              className={`ws-file-row ${f.isDir ? 'dir' : 'file'}`}
              onClick={() => !f.isDir && openFileContent(f.path)}
            >
              <span className="ws-file-icon">{f.isDir ? '📁' : '📄'}</span>
              <span className="ws-file-name">{f.name}</span>
              {!f.isDir && <span className="ws-file-open">OPEN →</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
