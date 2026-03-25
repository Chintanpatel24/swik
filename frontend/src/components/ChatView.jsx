import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

export default function ChatView({ agents, messages, selectedAgent, onSelectAgent, sendChat }) {
  const [input,      setInput]      = useState('');
  const [sending,    setSending]    = useState(false);
  const [localMsgs,  setLocalMsgs]  = useState([]);
  const [streaming,  setStreaming]   = useState('');
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Filter messages for current agent chat
  const chatMsgs = [
    ...messages.filter(m =>
      selectedAgent && (
        (m.from_agent === selectedAgent.id && m.to_agent === 'user') ||
        (m.from_agent === 'user' && m.to_agent === selectedAgent.id)
      )
    ),
    ...localMsgs,
  ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMsgs, streaming]);

  const handleSend = async () => {
    if (!input.trim() || !selectedAgent || sending) return;
    const msg = input.trim();
    setInput('');
    setSending(true);
    setStreaming('');

    const userMsg = { id: Date.now() + 'u', from_agent: 'user', to_agent: selectedAgent.id, content: msg, type: 'chat' };
    setLocalMsgs(m => [...m, userMsg]);

    const botId = Date.now() + 'b';
    let full = '';
    try {
      full = await sendChat(selectedAgent.id, msg, (chunk, total) => {
        setStreaming(total);
        full = total;
      });
      const botMsg = { id: botId, from_agent: selectedAgent.id, to_agent: 'user', content: full, type: 'chat' };
      setLocalMsgs(m => [...m, botMsg]);
    } catch (e) {
      setLocalMsgs(m => [...m, { id: botId, from_agent: selectedAgent.id, to_agent: 'user', content: `Error: ${e.message}`, type: 'error' }]);
    }
    setStreaming('');
    setSending(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="chat-view">
      {/* Agent selector */}
      <div className="chat-agent-select">
        <div style={{ padding: '10px 12px', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}>
          Select Agent
        </div>
        {agents.length === 0 ? (
          <div style={{ padding: 16, fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>
            No agents yet
          </div>
        ) : agents.map(a => (
          <div
            key={a.id}
            className={`chat-agent-item ${selectedAgent?.id === a.id ? 'active' : ''}`}
            onClick={() => { onSelectAgent(a); setLocalMsgs([]); setStreaming(''); }}
          >
            <div style={{ fontSize: 20 }}>{a.avatar || '🤖'}</div>
            <div>
              <div className="chat-agent-item-name" style={{ color: a.color || 'var(--text-primary)' }}>{a.name}</div>
              <div className="chat-agent-item-role">{a.role}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Chat main */}
      <div className="chat-main">
        {!selectedAgent ? (
          <div className="chat-placeholder">
            <div className="chat-placeholder-icon">◈</div>
            <div className="chat-placeholder-text">
              Select an agent from the left to start chatting.<br />
              Each agent has its own personality and skills.
            </div>
          </div>
        ) : (
          <>
            <div className="chat-header">
              <div style={{ fontSize: 22 }}>{selectedAgent.avatar || '🤖'}</div>
              <div>
                <div className="chat-header-name" style={{ color: selectedAgent.color || 'var(--text-primary)' }}>
                  {selectedAgent.name}
                </div>
                <div className="chat-header-info">{selectedAgent.role} · {selectedAgent.model} · ⚡{selectedAgent.strength || 1}x</div>
              </div>
            </div>

            <div className="chat-messages">
              {chatMsgs.length === 0 && !streaming && (
                <div className="chat-placeholder">
                  <div className="chat-placeholder-icon" style={{ fontSize: 32 }}>{selectedAgent.avatar || '🤖'}</div>
                  <div className="chat-placeholder-text">
                    Start a conversation with <strong style={{ color: selectedAgent.color }}>{selectedAgent.name}</strong>
                  </div>
                </div>
              )}
              {chatMsgs.map(m => (
                <ChatMessage key={m.id} msg={m} agent={selectedAgent} />
              ))}
              {streaming && (
                <ChatMessage msg={{ from_agent: selectedAgent.id, content: streaming, type: 'streaming' }} agent={selectedAgent} isStreaming />
              )}
              <div ref={bottomRef} />
            </div>

            <div className="chat-input-area">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={`Message ${selectedAgent.name}… (Enter to send, Shift+Enter for newline)`}
                disabled={sending}
                rows={2}
              />
              <button className="btn btn-primary" onClick={handleSend} disabled={sending || !input.trim()}>
                {sending ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '▶'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ChatMessage({ msg, agent, isStreaming }) {
  const isUser = msg.from_agent === 'user';
  return (
    <div className={`msg ${isUser ? 'user' : ''}`}>
      <div className="msg-avatar" style={{ background: isUser ? 'rgba(255,255,255,0.06)' : (agent?.color || '#00ff88') + '22' }}>
        {isUser ? '👤' : (agent?.avatar || '🤖')}
      </div>
      <div className="msg-body">
        <div className="msg-meta">
          <span>{isUser ? 'You' : agent?.name}</span>
          <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className={`msg-bubble md-content ${isStreaming ? 'streaming' : ''}`}>
          <ReactMarkdown>{msg.content || ''}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
