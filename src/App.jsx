import { useState } from 'react';
import { useOffice }      from './hooks/useOffice';
import TitleBar           from './components/Office/TitleBar';
import Sidebar            from './components/Office/Sidebar';
import OfficeCanvas       from './components/Office/OfficeCanvas';
import ChatPanel          from './components/Chat/ChatPanel';
import TaskPanel          from './components/Task/TaskPanel';
import WorkspacePanel     from './components/Task/WorkspacePanel';
import AgentEditor        from './components/Settings/AgentEditor';
import ToastStack         from './components/Office/ToastStack';
import './styles/main.css';

export default function App() {
  const {
    connected, agents, tasks, messages, agentStatuses, toasts, dismissToast,
    createAgent, updateAgent, deleteAgent,
    createTask, deleteTask, sendMessage,
    getWorkspace, getFile,
  } = useOffice();

  const [selectedAgent, setSelectedAgent] = useState(null);
  const [editingAgent,  setEditingAgent]  = useState(null);   // null | agent | 'new'
  const [rightTab,      setRightTab]      = useState('chat'); // chat | tasks | workspace

  // From 3D click — agentId string
  const handleSelectById = (agentId) => {
    if (!agentId) { setSelectedAgent(null); return; }
    const a = agents.find(x => x.id === agentId);
    setSelectedAgent(prev => prev?.id === agentId ? null : (a || null));
  };

  // From sidebar — agent object or null
  const handleSelectAgent = (agent) => setSelectedAgent(agent);

  const handleSaveAgent = async (data) => {
    if (editingAgent === 'new') {
      await createAgent(data);
    } else {
      await updateAgent(editingAgent.id, data);
      if (selectedAgent?.id === editingAgent.id) {
        setSelectedAgent(prev => ({ ...prev, ...data }));
      }
    }
  };

  const safeSkills = (a) => {
    if (!a) return [];
    try { return JSON.parse(a.skills || '[]'); } catch { return []; }
  };

  const runningCount = tasks.filter(t => t.status === 'running').length;

  return (
    <div className="app-root">
      <TitleBar connected={connected} agentCount={agents.length} />

      <div className="app-body">
        {/* ── Left sidebar ── */}
        <Sidebar
          agents={agents}
          agentStatuses={agentStatuses}
          selectedAgent={selectedAgent}
          onSelectAgent={handleSelectAgent}
          onNewAgent={() => setEditingAgent('new')}
          onEditAgent={a => setEditingAgent(a)}
        />

        {/* ── Centre: 3D scene ── */}
        <div className="centre-pane">
          <OfficeCanvas
            agents={agents}
            agentStatuses={agentStatuses}
            messages={messages}
            selectedAgent={selectedAgent}
            onSelectAgent={handleSelectById}
          />

          {/* Agent info bar */}
          {selectedAgent && (
            <div className="agent-infobar">
              <div className="aib-avatar" style={{ background: selectedAgent.color }}>
                {selectedAgent.name[0].toUpperCase()}
              </div>
              <div className="aib-info">
                <div className="aib-name" style={{ color: selectedAgent.color }}>
                  {selectedAgent.name}
                </div>
                <div className="aib-role">{selectedAgent.role}</div>
              </div>
              <div className="aib-skills">
                {safeSkills(selectedAgent).slice(0, 4).map(s => (
                  <span key={s} className="skill-tag">{s}</span>
                ))}
              </div>
              <div className="aib-meta">
                <span className="aib-model">⬡ {selectedAgent.model}</span>
                <span className="aib-provider">{selectedAgent.api_type}</span>
              </div>
              <div className="aib-actions">
                <button
                  className="aib-chat-btn"
                  onClick={() => setRightTab('chat')}
                >💬 CHAT</button>
                <button
                  className="aib-ws-btn"
                  onClick={() => setRightTab('workspace')}
                >📁 FILES</button>
                <button
                  className="aib-edit-btn"
                  onClick={() => setEditingAgent(selectedAgent)}
                >✎ EDIT</button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right pane ── */}
        <div className="right-pane">
          <div className="right-tabs">
            <button className={`right-tab ${rightTab === 'chat' ? 'active' : ''}`}
              onClick={() => setRightTab('chat')}>💬 CHAT</button>
            <button className={`right-tab ${rightTab === 'tasks' ? 'active' : ''}`}
              onClick={() => setRightTab('tasks')}>
              ⚡ TASKS
              {runningCount > 0 && <span className="running-badge">{runningCount}</span>}
            </button>
            <button className={`right-tab ${rightTab === 'workspace' ? 'active' : ''}`}
              onClick={() => setRightTab('workspace')}>📁 FILES</button>
          </div>

          {rightTab === 'chat' && (
            <ChatPanel
              agents={agents}
              messages={messages}
              selectedAgent={selectedAgent}
              onSendMessage={sendMessage}
              onCreateTask={createTask}
            />
          )}
          {rightTab === 'tasks' && (
            <TaskPanel
              tasks={tasks}
              agents={agents}
              onDeleteTask={deleteTask}
            />
          )}
          {rightTab === 'workspace' && (
            <WorkspacePanel
              agent={selectedAgent}
              getWorkspace={getWorkspace}
              getFile={getFile}
            />
          )}
        </div>
      </div>

      {/* Toast notifications */}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* Agent editor modal */}
      {editingAgent && (
        <AgentEditor
          agent={editingAgent === 'new' ? null : editingAgent}
          onSave={handleSaveAgent}
          onDelete={deleteAgent}
          onClose={() => setEditingAgent(null)}
        />
      )}
    </div>
  );
}
