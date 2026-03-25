import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = `ws://${location.host}/ws`;

export function useNexus() {
  const [connected,    setConnected]    = useState(false);
  const [agents,       setAgents]       = useState([]);
  const [tasks,        setTasks]        = useState([]);
  const [messages,     setMessages]     = useState([]);
  const [agentStatus,  setAgentStatus]  = useState({});  // id → { status, message }
  const [pythonStatus, setPythonStatus] = useState(null);
  const [toasts,       setToasts]       = useState([]);
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);

  const toast = useCallback((msg, type = 'info') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      if (reconnectRef.current) { clearInterval(reconnectRef.current); reconnectRef.current = null; }
    };

    ws.onclose = () => {
      setConnected(false);
      if (!reconnectRef.current) {
        reconnectRef.current = setInterval(connect, 3000);
      }
    };

    ws.onmessage = (e) => {
      try {
        const { type, data } = JSON.parse(e.data);
        switch (type) {
          case 'init':
            setAgents(data.agents || []);
            setTasks(data.tasks || []);
            setMessages(data.messages || []);
            break;
          case 'agent_created': setAgents(a => [...a, data]); break;
          case 'agent_updated': setAgents(a => a.map(x => x.id === data.id ? data : x)); break;
          case 'agent_deleted': setAgents(a => a.filter(x => x.id !== data.id)); break;
          case 'task_created':  setTasks(t => [data, ...t]); break;
          case 'task_update':   setTasks(t => t.map(x => x.id === data.id ? data : x)); break;
          case 'task_deleted':  setTasks(t => t.filter(x => x.id !== data.id)); break;
          case 'new_message':   setMessages(m => [...m.slice(-499), data]); break;
          case 'agent_status':
            setAgentStatus(s => ({ ...s, [data.agentId]: { status: data.status, message: data.message } }));
            break;
        }
      } catch {}
    };
  }, []);

  useEffect(() => {
    connect();
    return () => { wsRef.current?.close(); if (reconnectRef.current) clearInterval(reconnectRef.current); };
  }, [connect]);

  // Check Python status
  useEffect(() => {
    const check = () =>
      fetch('/api/python/status')
        .then(r => r.json())
        .then(d => setPythonStatus(d))
        .catch(() => setPythonStatus({ ok: false }));
    check();
    const t = setInterval(check, 15000);
    return () => clearInterval(t);
  }, []);

  // ── Agent CRUD ────────────────────────────────────────────
  const createAgent = useCallback(async (data) => {
    const r = await fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!r.ok) { toast('Failed to create agent', 'error'); return null; }
    toast(`Agent "${data.name}" created`, 'success');
    return r.json();
  }, [toast]);

  const updateAgent = useCallback(async (id, data) => {
    const r = await fetch(`/api/agents/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!r.ok) { toast('Failed to update agent', 'error'); return null; }
    toast(`Agent updated`, 'success');
    return r.json();
  }, [toast]);

  const deleteAgent = useCallback(async (id) => {
    await fetch(`/api/agents/${id}`, { method: 'DELETE' });
    toast('Agent deleted', 'info');
  }, [toast]);

  // ── Task CRUD ────────────────────────────────────────────
  const createTask = useCallback(async (data) => {
    const r = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!r.ok) { toast('Failed to create task', 'error'); return null; }
    toast(`Task "${data.title}" started`, 'success');
    return r.json();
  }, [toast]);

  const deleteTask = useCallback(async (id) => {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    toast('Task deleted', 'info');
  }, [toast]);

  // ── Chat ────────────────────────────────────────────────
  const sendChat = useCallback(async (agentId, message, onToken) => {
    const r = await fetch('/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ agent_id: agentId, message }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let full = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = dec.decode(value);
      full += chunk;
      onToken?.(chunk, full);
    }
    return full;
  }, []);

  const dismissToast = useCallback((id) => setToasts(t => t.filter(x => x.id !== id)), []);

  return {
    connected, agents, tasks, messages, agentStatus, pythonStatus,
    toasts, dismissToast, toast,
    createAgent, updateAgent, deleteAgent,
    createTask, deleteTask,
    sendChat,
  };
}
