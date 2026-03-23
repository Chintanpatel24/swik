import { useEffect, useRef, useState, useCallback } from 'react';

const API = 'http://localhost:7842';
const WS  = 'ws://localhost:7842';

export function useOffice() {
  const ws          = useRef(null);
  const timerRef    = useRef(null);
  const mountedRef  = useRef(true);

  const [connected,     setConnected]   = useState(false);
  const [agents,        setAgents]      = useState([]);
  const [tasks,         setTasks]       = useState([]);
  const [messages,      setMessages]    = useState([]);
  const [agentStatuses, setStatuses]    = useState({});
  const [toasts,        setToasts]      = useState([]);   // [{id,type,text}]

  // ── Toast helpers ────────────────────────────────────────────
  const addToast = useCallback((type, text) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-4), { id, type, text }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  const dismissToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  // ── WebSocket ────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    // Close any existing socket cleanly
    if (ws.current && ws.current.readyState < 2) {
      ws.current.onclose = null;
      ws.current.close();
    }

    const socket = new WebSocket(WS);
    ws.current = socket;

    socket.onopen = () => {
      if (!mountedRef.current) return;
      setConnected(true);
    };

    socket.onclose = () => {
      if (!mountedRef.current) return;
      setConnected(false);
      timerRef.current = setTimeout(connect, 3000);
    };

    socket.onerror = () => {
      socket.close();
    };

    socket.onmessage = ({ data }) => {
      try { handle(JSON.parse(data)); } catch {}
    };
  }, []); // stable — no deps needed

  function handle(msg) {
    switch (msg.type) {
      case 'init':
        setAgents(msg.data.agents   || []);
        setTasks(msg.data.tasks     || []);
        setMessages(msg.data.messages || []);
        break;

      case 'agent_created':
        setAgents(prev => [...prev, msg.data]);
        addToast('info', `Agent "${msg.data.name}" joined the office`);
        break;

      case 'agent_updated':
        setAgents(prev => prev.map(a => a.id === msg.data.id ? msg.data : a));
        break;

      case 'agent_deleted':
        setAgents(prev => prev.filter(a => a.id !== msg.data.id));
        break;

      case 'agent_moved':
        setAgents(prev => prev.map(a =>
          a.id === msg.data.id ? { ...a, desk_x: msg.data.x, desk_y: msg.data.y } : a
        ));
        break;

      case 'agent_status':
        setStatuses(prev => ({
          ...prev,
          [msg.data.agentId]: { status: msg.data.status, message: msg.data.message || '' }
        }));
        break;

      case 'task_created':
        setTasks(prev => [msg.data, ...prev]);
        addToast('info', `Task dispatched: "${msg.data.title}"`);
        break;

      case 'task_update':
        setTasks(prev => prev.map(t => t.id === msg.data.id ? msg.data : t));
        if (msg.data.status === 'done') {
          addToast('success', `✓ Task complete: "${msg.data.title}"`);
        } else if (msg.data.status === 'error') {
          addToast('error', `✗ Task failed: "${msg.data.title}"`);
        }
        break;

      case 'task_deleted':
        setTasks(prev => prev.filter(t => t.id !== msg.data.id));
        break;

      case 'new_message':
        setMessages(prev => [...prev, msg.data].slice(-400));
        break;

      case 'task_complete':
        addToast('success', `⚡ Team completed a task!`);
        break;
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current);
      if (ws.current) {
        ws.current.onclose = null;
        ws.current.close();
      }
    };
  }, [connect]);

  // ── API helpers ──────────────────────────────────────────────
  const api = (path, opts = {}) =>
    fetch(`${API}${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts })
      .then(r => r.json());

  const createAgent  = (data)     => api('/api/agents',         { method: 'POST',   body: JSON.stringify(data) });
  const updateAgent  = (id, data) => api(`/api/agents/${id}`,   { method: 'PUT',    body: JSON.stringify(data) });
  const deleteAgent  = (id)       => api(`/api/agents/${id}`,   { method: 'DELETE' });
  const createTask   = (data)     => api('/api/tasks',           { method: 'POST',   body: JSON.stringify(data) });
  const deleteTask   = (id)       => api(`/api/tasks/${id}`,     { method: 'DELETE' });
  const sendMessage  = (to, content) => api('/api/messages',    { method: 'POST',   body: JSON.stringify({ to_agent: to, content }) });
  const getWorkspace = (agentId, taskId) => api(`/api/workspace/${agentId}${taskId ? `?taskId=${taskId}` : ''}`);
  const getFile      = (agentId, taskId, filePath) => api(`/api/workspace/${agentId}/file?taskId=${taskId}&path=${encodeURIComponent(filePath)}`);

  return {
    connected, agents, tasks, messages, agentStatuses, toasts, dismissToast,
    createAgent, updateAgent, deleteAgent,
    createTask, deleteTask, sendMessage,
    getWorkspace, getFile,
  };
}
