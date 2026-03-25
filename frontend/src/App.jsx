import { useState } from 'react';
import { useNexus }     from './hooks/useNexus.js';
import Header           from './components/Header.jsx';
import Sidebar          from './components/Sidebar.jsx';
import AgentsView       from './components/AgentsView.jsx';
import ChatView         from './components/ChatView.jsx';
import TasksView        from './components/TasksView.jsx';
import PythonView       from './components/PythonView.jsx';
import AgentModal       from './components/AgentModal.jsx';
import ToastStack       from './components/ToastStack.jsx';
import './styles/layout.css';

export default function App() {
  const nexus = useNexus();
  const { agents, tasks, messages, agentStatus, connected, toasts, dismissToast,
          pythonStatus, createAgent, updateAgent, deleteAgent, createTask, deleteTask, sendChat } = nexus;

  const [view,         setView]    = useState('agents');   // agents | chat | tasks | python
  const [editingAgent, setEditing] = useState(null);       // null | 'new' | agent object
  const [selectedAgent,setSelected]= useState(null);

  const handleSaveAgent = async (data) => {
    if (editingAgent === 'new') {
      await createAgent(data);
    } else {
      await updateAgent(editingAgent.id, data);
      if (selectedAgent?.id === editingAgent.id) setSelected(a => ({ ...a, ...data }));
    }
    setEditing(null);
  };

  const taskRunning = tasks.filter(t => t.status === 'running').length;
  const strength = agents.reduce((s, a) => s * Math.max(1, a.strength || 1), 1);

  return (
    <div className="app">
      <Header
        connected={connected}
        agentCount={agents.length}
        taskRunning={taskRunning}
        networkStrength={strength}
        pythonOk={pythonStatus?.ok}
        onNewAgent={() => setEditing('new')}
      />

      <div className="app-body">
        <Sidebar
          agents={agents}
          agentStatus={agentStatus}
          selectedAgent={selectedAgent}
          onSelectAgent={a => { setSelected(prev => prev?.id === a?.id ? null : a); setView('chat'); }}
          onEditAgent={a => setEditing(a)}
          onDeleteAgent={deleteAgent}
          onNewAgent={() => setEditing('new')}
          pythonStatus={pythonStatus}
        />

        <div className="main-content">
          {/* Tab bar */}
          <div className="view-tabs">
            {[
              { id: 'agents', label: '⬡ Agents' },
              { id: 'chat',   label: '◈ Chat' },
              { id: 'tasks',  label: `◉ Tasks ${taskRunning ? `(${taskRunning})` : ''}` },
              { id: 'python', label: `🐍 Python ${pythonStatus?.ok ? '●' : '○'}` },
            ].map(t => (
              <button key={t.id} className={`view-tab ${view === t.id ? 'active' : ''}`} onClick={() => setView(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="view-content">
            {view === 'agents' && (
              <AgentsView
                agents={agents}
                agentStatus={agentStatus}
                onEditAgent={a => setEditing(a)}
                onDeleteAgent={deleteAgent}
                onNewAgent={() => setEditing('new')}
                onChatAgent={a => { setSelected(a); setView('chat'); }}
              />
            )}
            {view === 'chat' && (
              <ChatView
                agents={agents}
                messages={messages}
                selectedAgent={selectedAgent}
                onSelectAgent={setSelected}
                sendChat={sendChat}
              />
            )}
            {view === 'tasks' && (
              <TasksView
                agents={agents}
                tasks={tasks}
                messages={messages}
                agentStatus={agentStatus}
                onCreateTask={createTask}
                onDeleteTask={deleteTask}
              />
            )}
            {view === 'python' && (
              <PythonView pythonStatus={pythonStatus} agents={agents} />
            )}
          </div>
        </div>
      </div>

      {editingAgent !== null && (
        <AgentModal
          agent={editingAgent === 'new' ? null : editingAgent}
          onSave={handleSaveAgent}
          onClose={() => setEditing(null)}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
