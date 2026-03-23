import { useEffect, useRef, useState, useCallback } from 'react';

// Works in both web mode (same origin) and desktop (direct port)
const BASE  = import.meta.env.DEV ? 'http://localhost:7843' : '';
const WS_URL= import.meta.env.DEV ? 'ws://localhost:7843'
  : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;

export function useSwik() {
  const ws         = useRef(null);
  const reconnTimer= useRef(null);
  const mountedRef = useRef(true);

  const [connected,    setConnected]   = useState(false);
  const [agents,       setAgents]      = useState([]);
  const [tasks,        setTasks]       = useState([]);
  const [messages,     setMessages]    = useState([]);
  const [agentStatus,  setAgentStatus] = useState({});   // id→{status,message}
  const [settings,     setSettings]    = useState({});
  const [serverConfig, setServerConfig]= useState({});
  const [toasts,       setToasts]      = useState([]);

  const addToast = useCallback((type, text) => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p.slice(-4), { id, type, text }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 5000);
  }, []);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (ws.current?.readyState < 2) { ws.current.onclose = null; ws.current.close(); }

    const socket = new WebSocket(WS_URL);
    ws.current = socket;

    socket.onopen  = () => { if (mountedRef.current) setConnected(true); };
    socket.onclose = () => {
      if (!mountedRef.current) return;
      setConnected(false);
      reconnTimer.current = setTimeout(connect, 3000);
    };
    socket.onerror = () => socket.close();
    socket.onmessage = ({ data }) => { try { handle(JSON.parse(data)); } catch {} };
  }, []);

  function handle(msg) {
    switch (msg.type) {
      case 'init':
        setAgents(msg.data.agents   || []);
        setTasks(msg.data.tasks     || []);
        setMessages(msg.data.messages || []);
        setSettings(msg.data.settings || {});
        setServerConfig(msg.data.config  || {});
        break;
      case 'agent_created':
        setAgents(p => [...p, msg.data]);
        addToast('info', `${msg.data.name} joined the HQ`);
        break;
      case 'agent_updated':
        setAgents(p => p.map(a => a.id === msg.data.id ? msg.data : a));
        break;
      case 'agent_deleted':
        setAgents(p => p.filter(a => a.id !== msg.data.id));
        break;
      case 'agent_status':
        setAgentStatus(p => ({ ...p, [msg.data.agentId]: { status: msg.data.status, message: msg.data.message||'' } }));
        break;
      case 'task_created':
        setTasks(p => [msg.data, ...p]);
        addToast('info', `Task dispatched: "${msg.data.title}"`);
        break;
      case 'task_update':
        setTasks(p => p.map(t => t.id === msg.data.id ? msg.data : t));
        if (msg.data.status === 'done')  addToast('success', `✓ Done: "${msg.data.title}"`);
        if (msg.data.status === 'error') addToast('error',   `✗ Failed: "${msg.data.title}"`);
        break;
      case 'task_deleted':
        setTasks(p => p.filter(t => t.id !== msg.data.id));
        break;
      case 'new_message':
        setMessages(p => [...p, msg.data].slice(-400));
        break;
      case 'settings_updated':
        setSettings(msg.data);
        break;
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(reconnTimer.current);
      if (ws.current) { ws.current.onclose = null; ws.current.close(); }
    };
  }, [connect]);

  const api = (path, opts = {}) =>
    fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts })
      .then(r => r.json());

  const createAgent  = d      => api('/api/agents',         { method: 'POST',   body: JSON.stringify(d) });
  const updateAgent  = (id,d) => api(`/api/agents/${id}`,   { method: 'PUT',    body: JSON.stringify(d) });
  const deleteAgent  = id     => api(`/api/agents/${id}`,   { method: 'DELETE' });
  const createTask   = d      => api('/api/tasks',           { method: 'POST',   body: JSON.stringify(d) });
  const deleteTask   = id     => api(`/api/tasks/${id}`,     { method: 'DELETE' });
  const sendMessage  = (to,c) => api('/api/messages',       { method: 'POST',   body: JSON.stringify({ to_agent: to, content: c }) });
  const saveSetting  = (k,v)  => api('/api/settings',       { method: 'POST',   body: JSON.stringify({ key: k, value: v }) });
  const getWorkspace = (aid, tid) => api(`/api/workspace/${aid}${tid ? `?taskId=${tid}` : ''}`);
  const getFile      = (aid, tid, fp) => api(`/api/workspace/${aid}/file?taskId=${tid}&path=${encodeURIComponent(fp)}`);
  const dismissToast = id     => setToasts(p => p.filter(t => t.id !== id));

  return {
    connected, agents, tasks, messages, agentStatus, settings, serverConfig,
    toasts, dismissToast,
    createAgent, updateAgent, deleteAgent,
    createTask, deleteTask, sendMessage, saveSetting,
    getWorkspace, getFile,
  };
}
