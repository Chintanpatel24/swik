import { useState } from 'react';
import { useOffice }      from './hooks/useOffice';
import TitleBar           from './components/Office/TitleBar';
import Sidebar            from './components/Office/Sidebar';
import OfficeCanvas       from './components/Office/OfficeCanvas';
import ChatPanel          from './components/Chat/ChatPanel';
import TaskPanel          from './components/Task/TaskPanel';
import AgentEditor        from './components/Settings/AgentEditor';
import './styles/main.css';

export default function App() {
  const {
    connected, agents, tasks, messages, agentStatuses,
    createAgent, updateAgent, deleteAgent, moveAgent,
    createTask, deleteTask, sendMessage
  } = useOffice();

  const [selectedAgent, setSelectedAgent] = useState(null);
  const [editingAgent,  setEditingAgent]  = useState(null);  // null | agent | 'new'
  const [rightTab,      setRightTab]      = useState('chat'); // chat | tasks

  const handleSelectAgent = (agent) => {
    setSelectedAgent(prev => prev?.id === agent.id ? null : agent);
  };

  const handleEditAgent = (agent) => setEditingAgent(agent);
  const handleNewAgent  = ()      => setEditingAgent('new');

  const handleSaveAgent = async (data) => {
    if (editingAgent === 'new') {
      await createAgent(data);
    } else {
      await updateAgent(editingAgent.id, data);
      // Refresh selected if it's the one being edited
      if (selectedAgent?.id === editingAgent.id) {
        setSelectedAgent({ ...editingAgent, ...data });
      }
    }
  };

  const handleMoveAgent = (id, x, y) => {
    moveAgent(id, Math.max(0, x), Math.max(0, y));
  };

  return (
    <div className="app-root">
      <TitleBar connected={connected} agentCount={agents.length}/>

      <div className="app-body">
        {/* Left sidebar — agent roster */}
        <Sidebar
          agents={agents}
          agentStatuses={agentStatuses}
          selectedAgent={selectedAgent}
          onSelectAgent={handleSelectAgent}
          onNewAgent={handleNewAgent}
        />

        {/* Centre — office canvas */}
        <div className="centre-pane">
          <OfficeCanvas
            agents={agents}
            agentStatuses={agentStatuses}
            messages={messages}
            selectedAgent={selectedAgent}
            onSelectAgent={handleSelectAgent}
            onMoveAgent={handleMoveAgent}
          />

          {/* Agent info bar when selected */}
          {selectedAgent && (
            <div className="agent-infobar" style={{ '--ac': selectedAgent.color }}>
              <div className="aib-name" style={{ color: selectedAgent.color }}>{selectedAgent.name}</div>
              <div className="aib-role">{selectedAgent.role}</div>
              <div className="aib-skills">
                {(JSON.parse(selectedAgent.skills || '[]')).map(s => (
                  <span key={s} className="skill-tag">{s}</span>
                ))}
              </div>
              <div className="aib-model">⬡ {selectedAgent.model} · {selectedAgent.api_type}</div>
              <button className="aib-edit-btn" onClick={() => handleEditAgent(selectedAgent)}>EDIT AGENT</button>
            </div>
          )}
        </div>

        {/* Right pane — chat + tasks */}
        <div className="right-pane">
          <div className="right-tabs">
            <button className={`right-tab ${rightTab === 'chat'  ? 'active' : ''}`} onClick={() => setRightTab('chat')}>💬 CHAT</button>
            <button className={`right-tab ${rightTab === 'tasks' ? 'active' : ''}`} onClick={() => setRightTab('tasks')}>
              ⚡ TASKS {tasks.filter(t => t.status === 'running').length > 0 && (
                <span className="running-badge">{tasks.filter(t => t.status === 'running').length}</span>
              )}
            </button>
          </div>

          {rightTab === 'chat' ? (
            <ChatPanel
              agents={agents}
              messages={messages}
              selectedAgent={selectedAgent}
              onSendMessage={sendMessage}
              onCreateTask={createTask}
            />
          ) : (
            <TaskPanel
              tasks={tasks}
              agents={agents}
              onDeleteTask={deleteTask}
            />
          )}
        </div>
      </div>

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
