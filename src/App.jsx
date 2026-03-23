import { useState } from 'react';
import { useSwik }     from './hooks/useSwik.js';
import TitleBar        from './components/Building/TitleBar.jsx';
import Sidebar         from './components/Building/Sidebar.jsx';
import BuildingCanvas  from './components/Building/BuildingCanvas.jsx';
import ChatPanel       from './components/Chat/ChatPanel.jsx';
import { TaskPanel, WorkspacePanel } from './components/Task/TaskPanels.jsx';
import AgentEditor     from './components/Settings/AgentEditor.jsx';
import ToastStack      from './components/Common/ToastStack.jsx';
import AIStatusBar     from './components/Common/AIStatusBar.jsx';
import './styles/main.css';

export default function App() {
  const {
    connected, agents, tasks, messages, agentStatus, settings, serverConfig,
    toasts, dismissToast,
    createAgent, updateAgent, deleteAgent,
    createTask, deleteTask, sendMessage,
    getWorkspace, getFile,
  } = useSwik();

  const [selectedAgent, setSelected]  = useState(null);
  const [editingAgent,  setEditing]   = useState(null);   // null | agent | 'new'
  const [rightTab,      setRightTab]  = useState('chat'); // chat | tasks | files

  const handleSelectById = (id) => {
    if (!id) { setSelected(null); return; }
    const a = agents.find(x => x.id === id);
    setSelected(prev => prev?.id === id ? null : (a || null));
  };

  const handleSave = async (data) => {
    if (editingAgent === 'new') await createAgent(data);
    else {
      await updateAgent(editingAgent.id, data);
      if (selectedAgent?.id === editingAgent.id) setSelected(prev => ({ ...prev, ...data }));
    }
  };

  const safeSkills = a => { try { return JSON.parse(a?.skills||'[]'); } catch { return []; } };
  const running = tasks.filter(t => t.status === 'running').length;

  return (
    <div className="app">
      <TitleBar connected={connected} agentCount={agents.length} taskRunning={running}/>
      <AIStatusBar serverConfig={serverConfig}/>

      <div className="app-body">
        {/* ── Left: floor-grouped roster ── */}
        <Sidebar
          agents={agents}
          agentStatus={agentStatus}
          selectedAgent={selectedAgent}
          onSelectAgent={a => setSelected(prev => prev?.id===a?.id ? null : a)}
          onNewAgent={() => setEditing('new')}
          onEditAgent={a => setEditing(a)}
        />

        {/* ── Centre: 3D building ── */}
        <div className="centre">
          <BuildingCanvas
            agents={agents}
            agentStatus={agentStatus}
            messages={messages}
            selectedAgent={selectedAgent}
            onSelectAgent={handleSelectById}
          />

          {/* Agent infobar */}
          {selectedAgent && (
            <div className="infobar">
              <div className="ib-av" style={{ background: selectedAgent.color }}>
                {selectedAgent.name[0]}
              </div>
              <div className="ib-info">
                <div className="ib-name" style={{ color: selectedAgent.color }}>{selectedAgent.name}</div>
                <div className="ib-sub">{selectedAgent.role} · Floor {selectedAgent.floor} · {selectedAgent.model}</div>
              </div>
              <div className="ib-skills">
                {safeSkills(selectedAgent).slice(0,4).map(s => <span key={s} className="skill-tag">{s}</span>)}
              </div>
              <div className="ib-btns">
                <button className="ib-btn"    onClick={() => setRightTab('chat')}>💬</button>
                <button className="ib-btn"    onClick={() => setRightTab('files')}>📁</button>
                <button className="ib-btn-edit" onClick={() => setEditing(selectedAgent)}>✎ EDIT</button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: chat / tasks / files ── */}
        <div className="right-pane">
          <div className="right-tabs">
            <button className={`rtab ${rightTab==='chat'?'active':''}`}  onClick={()=>setRightTab('chat')}>💬 CHAT</button>
            <button className={`rtab ${rightTab==='tasks'?'active':''}`} onClick={()=>setRightTab('tasks')}>
              ⚡ TASKS {running>0 && <span className="running-badge">{running}</span>}
            </button>
            <button className={`rtab ${rightTab==='files'?'active':''}`} onClick={()=>setRightTab('files')}>📁 FILES</button>
          </div>

          {rightTab==='chat'  && <ChatPanel agents={agents} messages={messages} selectedAgent={selectedAgent} onSendMessage={sendMessage} onCreateTask={createTask}/>}
          {rightTab==='tasks' && <TaskPanel tasks={tasks} agents={agents} onDeleteTask={deleteTask}/>}
          {rightTab==='files' && <WorkspacePanel agent={selectedAgent} getWorkspace={getWorkspace} getFile={getFile}/>}
        </div>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast}/>

      {editingAgent && (
        <AgentEditor
          agent={editingAgent==='new' ? null : editingAgent}
          onSave={handleSave}
          onDelete={deleteAgent}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
