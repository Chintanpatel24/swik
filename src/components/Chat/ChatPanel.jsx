import { useState, useEffect, useRef } from 'react';

const MSG_COLORS = { user: '#4f8ef7', boss: '#f7c94f', dev: '#4f8ef7', design: '#f74faa', search: '#4ff7c4', write: '#c44ff7' };

function AgentBubble({ msg, agents }) {
  const agent = agents.find(a => a.id === msg.from_agent);
  const isUser = msg.from_agent === 'user';
  const color = agent?.color || '#888';

  return (
    <div className={`msg-row ${isUser ? 'msg-user' : 'msg-agent'}`}>
      {!isUser && (
        <div className="msg-avatar" style={{ background: color }}>
          {(agent?.name || msg.from_agent_name || '?')[0].toUpperCase()}
        </div>
      )}
      <div className="msg-bubble-wrap">
        {!isUser && <div className="msg-sender" style={{ color }}>{agent?.name || msg.from_agent_name || msg.from_agent}</div>}
        <div className={`msg-bubble ${msg.type} ${isUser ? 'user-bubble' : ''}`} style={isUser ? {} : { borderLeftColor: color }}>
          {msg.content}
        </div>
        <div className="msg-meta">
          {msg.type !== 'chat' && msg.type !== 'user' && <span className="msg-type-tag">{msg.type}</span>}
          {msg.to_agent && !isUser && (() => {
            const to = agents.find(a => a.id === msg.to_agent);
            return to ? <span className="msg-to">→ {to.name}</span> : null;
          })()}
        </div>
      </div>
      {isUser && <div className="msg-avatar user-avatar">YOU</div>}
    </div>
  );
}

export default function ChatPanel({ agents, messages, selectedAgent, onSendMessage, onCreateTask }) {
  const [tab, setTab] = useState('chat'); // chat | tasks
  const [input, setInput] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const filteredMsgs = selectedAgent
    ? messages.filter(m => m.from_agent === selectedAgent.id || m.to_agent === selectedAgent.id || m.to_agent === null)
    : messages;

  const handleSend = () => {
    if (!input.trim()) return;
    if (!selectedAgent) return;
    onSendMessage(selectedAgent.id, input.trim());
    setInput('');
  };

  const handleTask = async () => {
    if (!taskTitle.trim() || !taskDesc.trim()) return;
    setCreating(true);
    await onCreateTask({ title: taskTitle.trim(), description: taskDesc.trim() });
    setTaskTitle('');
    setTaskDesc('');
    setCreating(false);
    setTab('chat');
  };

  return (
    <div className="chat-panel">
      <div className="chat-tabs">
        <button className={`chat-tab ${tab === 'chat' ? 'active' : ''}`} onClick={() => setTab('chat')}>
          💬 CHAT
        </button>
        <button className={`chat-tab ${tab === 'task' ? 'active' : ''}`} onClick={() => setTab('task')}>
          ⚡ NEW TASK
        </button>
      </div>

      {tab === 'chat' && (
        <>
          <div className="chat-context">
            {selectedAgent
              ? <span style={{ color: selectedAgent.color }}>Chatting with <b>{selectedAgent.name}</b></span>
              : <span>Select an agent to chat · Showing all messages</span>
            }
          </div>

          <div className="chat-messages">
            {filteredMsgs.length === 0 ? (
              <div className="chat-empty">
                <div>💬</div>
                <p>No messages yet</p>
                <p>Click an agent and say hello</p>
              </div>
            ) : (
              filteredMsgs.map((m, i) => (
                <AgentBubble key={m.id || i} msg={m} agents={agents}/>
              ))
            )}
            <div ref={bottomRef}/>
          </div>

          <div className="chat-input-row">
            <input
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={selectedAgent ? `Message ${selectedAgent.name}...` : 'Select an agent first...'}
              disabled={!selectedAgent}
            />
            <button className="chat-send" onClick={handleSend} disabled={!selectedAgent || !input.trim()}>
              SEND
            </button>
          </div>
        </>
      )}

      {tab === 'task' && (
        <div className="task-creator">
          <p className="task-hint">
            The Boss agent will analyse the task, break it into subtasks, and assign them to the right agents.
          </p>
          <label className="field-label">TASK TITLE</label>
          <input className="field-input" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Build a login page..."/>

          <label className="field-label">DETAILS</label>
          <textarea className="field-input field-textarea"
            value={taskDesc} onChange={e => setTaskDesc(e.target.value)}
            placeholder="Describe what you need in detail. The agents will plan and execute it together..."/>

          <button className="btn btn-primary" onClick={handleTask}
            disabled={creating || !taskTitle.trim() || !taskDesc.trim()}>
            {creating ? '⚡ DISPATCHING...' : '⚡ DISPATCH TO TEAM'}
          </button>
        </div>
      )}
    </div>
  );
}
