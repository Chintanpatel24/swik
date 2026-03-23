import { useEffect, useRef, useState, useCallback } from 'react';

const API = 'http://localhost:7842';
const WS  = 'ws://localhost:7842';

export function useOffice() {
  const ws = useRef(null);
  const [connected, setConnected]     = useState(false);
  const [agents, setAgents]           = useState([]);
  const [tasks, setTasks]             = useState([]);
  const [messages, setMessages]       = useState([]);
  const [agentStatuses, setStatuses]  = useState({}); // agentId → { status, message }

  const connect = useCallback(() => {
    const socket = new WebSocket(WS);
    ws.current = socket;
    socket.onopen  = () => setConnected(true);
    socket.onclose = () => { setConnected(false); setTimeout(connect, 2000); };
    socket.onerror = () => socket.close();
    socket.onmessage = ({ data }) => {
      try { handle(JSON.parse(data)); } catch {}
    };
  }, []);

  function handle(msg) {
    switch (msg.type) {
      case 'init':
        setAgents(msg.data.agents || []);
        setTasks(msg.data.tasks || []);
        setMessages(msg.data.messages || []);
        break;
      case 'agent_created':
      case 'agent_updated':
        setAgents(prev => {
          const idx = prev.findIndex(a => a.id === msg.data.id);
          return idx >= 0 ? prev.map(a => a.id === msg.data.id ? msg.data : a) : [...prev, msg.data];
        });
        break;
      case 'agent_deleted':
        setAgents(prev => prev.filter(a => a.id !== msg.data.id));
        break;
      case 'agent_moved':
        setAgents(prev => prev.map(a => a.id === msg.data.id ? { ...a, desk_x: msg.data.x, desk_y: msg.data.y } : a));
        break;
      case 'agent_status':
        setStatuses(prev => ({
          ...prev,
          [msg.data.agentId]: { status: msg.data.status, message: msg.data.message || '' }
        }));
        break;
      case 'task_created':
      case 'task_update':
        setTasks(prev => {
          const idx = prev.findIndex(t => t.id === msg.data.id);
          return idx >= 0 ? prev.map(t => t.id === msg.data.id ? msg.data : t) : [msg.data, ...prev];
        });
        break;
      case 'task_deleted':
        setTasks(prev => prev.filter(t => t.id !== msg.data.id));
        break;
      case 'new_message':
        setMessages(prev => [...prev, msg.data].slice(-300));
        break;
    }
  }

  useEffect(() => { connect(); return () => ws.current?.close(); }, [connect]);

  // ── API HELPERS ──────────────────────────────────────────────────────────
  const api = (path, opts = {}) =>
    fetch(`${API}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opts
    }).then(r => r.json());

  const createAgent   = (data)     => api('/api/agents', { method: 'POST', body: JSON.stringify(data) });
  const updateAgent   = (id, data) => api(`/api/agents/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  const deleteAgent   = (id)       => api(`/api/agents/${id}`, { method: 'DELETE' });
  const moveAgent     = (id, x, y) => api(`/api/agents/${id}/position`, { method: 'PATCH', body: JSON.stringify({ x, y }) });

  const createTask    = (data)     => api('/api/tasks', { method: 'POST', body: JSON.stringify(data) });
  const deleteTask    = (id)       => api(`/api/tasks/${id}`, { method: 'DELETE' });
  const getTaskMsgs   = (id)       => api(`/api/tasks/${id}/messages`);

  const sendMessage   = (to, content) => api('/api/messages', { method: 'POST', body: JSON.stringify({ to_agent: to, content }) });

  return {
    connected, agents, tasks, messages, agentStatuses,
    createAgent, updateAgent, deleteAgent, moveAgent,
    createTask, deleteTask, getTaskMsgs, sendMessage
  };
}
