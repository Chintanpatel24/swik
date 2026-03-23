import { useState, useEffect, useRef } from 'react';

function Bubble({ msg, agents }) {
  const isUser  = msg.from_agent === 'user';
  const agent   = agents.find(a => a.id === msg.from_agent);
  const color   = agent?.color || '#888';
  const name    = isUser ? 'YOU' : (agent?.name || msg.from_agent_name || msg.from_agent);

  const TYPE_STYLE = {
    planning:   'msg-planning',
    delegation: 'msg-delegation',
    tool:       'msg-tool',
    result:     'msg-result',
    summary:    'msg-summary',
    error:      'msg-error',
  };

  return (
    <div className={`msg-row ${isUser ? 'msg-right' : 'msg-left'}`}>
      {!isUser && <div className="msg-av" style={{ background: color }}>{name[0]}</div>}
      <div className="msg-bubble-wrap">
        {!isUser && <div className="msg-sender" style={{ color }}>{name}</div>}
        <div className={`msg-bubble ${isUser?'msg-bubble-user':''} ${TYPE_STYLE[msg.type]||''}`}
          style={isUser ? {} : { borderLeftColor: color }}>
          {msg.content}
        </div>
        {msg.type && msg.type !== 'chat' && msg.type !== 'user' && (
          <span className="msg-type-tag">{msg.type}</span>
        )}
      </div>
      {isUser && <div className="msg-av msg-av-user">YOU</div>}
    </div>
  );
}

export default function ChatPanel({ agents, messages, selectedAgent, onSendMessage, onCreateTask }) {
  const [tab,       setTab]      = useState('chat');
  const [input,     setInput]    = useState('');
  const [title,     setTitle]    = useState('');
  const [desc,      setDesc]     = useState('');
  const [sending,   setSending]  = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const visible = selectedAgent
    ? messages.filter(m => m.from_agent === selectedAgent.id || m.to_agent === selectedAgent.id || (!m.to_agent && m.from_agent !== 'user'))
    : messages;

  const handleSend = () => {
    if (!input.trim() || !selectedAgent) return;
    onSendMessage(selectedAgent.id, input.trim());
    setInput('');
  };

  const handleTask = async () => {
    if (!title.trim() || !desc.trim()) return;
    setSending(true);
    await onCreateTask({ title: title.trim(), description: desc.trim() });
    setTitle(''); setDesc('');
    setSending(false);
    setTab('chat');
  };

  return (
    <div className="chat-panel">
      <div className="chat-tabs">
        <button className={`ctab ${tab==='chat'?'active':''}`} onClick={()=>setTab('chat')}>💬 CHAT</button>
        <button className={`ctab ${tab==='task'?'active':''}`} onClick={()=>setTab('task')}>⚡ DISPATCH</button>
      </div>

      {tab==='chat' && <>
        <div className="chat-ctx">
          {selectedAgent
            ? <span style={{color:selectedAgent.color}}>Talking with <b>{selectedAgent.name}</b> (Floor {selectedAgent.floor})</span>
            : <span className="dim">Select an agent to chat directly</span>}
        </div>

        <div className="chat-messages">
          {visible.length === 0
            ? <div className="chat-empty"><div>💬</div><p>No messages yet</p></div>
            : visible.map((m,i) => <Bubble key={m.id||i} msg={m} agents={agents}/>)
          }
          <div ref={bottomRef}/>
        </div>

        <div className="chat-inputrow">
          <input className="chat-inp"
            value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&handleSend()}
            placeholder={selectedAgent ? `Message ${selectedAgent.name}…` : 'Select an agent first…'}
            disabled={!selectedAgent}/>
          <button className="chat-send" onClick={handleSend} disabled={!selectedAgent||!input.trim()}>SEND</button>
        </div>
      </>}

      {tab==='task' && (
        <div className="task-form">
          <p className="task-hint">
            The Boss agent will analyse your task, break it into subtasks, delegate to the team, and synthesise a final result.
          </p>
          <label className="f-label">TASK TITLE</label>
          <input className="f-input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Build a login page…"/>

          <label className="f-label">DETAILS</label>
          <textarea className="f-input f-textarea" value={desc} onChange={e=>setDesc(e.target.value)}
            placeholder="Describe what you need in detail…"/>

          <button className="btn-primary full-width" onClick={handleTask}
            disabled={sending||!title.trim()||!desc.trim()}>
            {sending ? '⚡ DISPATCHING…' : '⚡ DISPATCH TO TEAM'}
          </button>
        </div>
      )}
    </div>
  );
}
