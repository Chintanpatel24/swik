import { useEffect, useRef, useState, useCallback } from 'react';

// In Docker/prod, nginx proxies /ws → backend:3001
// In dev, connect directly to localhost:3001
const WS_URL = import.meta.env.VITE_WS_URL ||
  (window.location.protocol === 'https:' ? 'wss://' : 'ws://') +
  window.location.hostname +
  (window.location.port && window.location.port !== '80' && window.location.port !== '443'
    ? `:${window.location.port}` : '') +
  (import.meta.env.DEV ? ':3001' : '/ws');

const RECONNECT_DELAY_MS = 3000;

export function useAgentSocket() {
  const ws             = useRef(null);
  const reconnectTimer = useRef(null);
  const [connected, setConnected]   = useState(false);
  const [logs, setLogs]             = useState([]);
  const [summaries, setSummaries]   = useState([]);
  const [interests, setInterests]   = useState([]);
  const [settings, setSettings]     = useState({});
  const [status, setStatus]         = useState({
    isScanning: false, scanCount: 0, lastScanAt: null,
    nextScanAt: null, uptime: 0, model: '', scanInterval: 30
  });
  const [progress, setProgress] = useState(0);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;
    const socket = new WebSocket(WS_URL);
    ws.current = socket;

    socket.onopen = () => {
      setConnected(true);
      clearTimeout(reconnectTimer.current);
    };
    socket.onclose = () => {
      setConnected(false);
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };
    socket.onerror = () => socket.close();
    socket.onmessage = (event) => {
      try { handle(JSON.parse(event.data)); } catch {}
    };
  }, []);

  function handle(msg) {
    switch (msg.type) {
      case 'init':
        setStatus(msg.data.status);
        setLogs(msg.data.logs || []);
        setSummaries(msg.data.summaries || []);
        setInterests(msg.data.interests || []);
        setSettings(msg.data.settings || {});
        break;
      case 'log':
        setLogs(prev => [...prev, msg.data].slice(-500));
        break;
      case 'new_summary':
        setSummaries(prev => [msg.data, ...prev]);
        setStatus(prev => ({ ...prev, scanCount: prev.scanCount + 1 }));
        break;
      case 'summary_deleted':
        setSummaries(prev => prev.filter(s => s.id !== msg.data.id));
        break;
      case 'progress':
        setProgress(msg.data.pct);
        break;
      case 'scan_start':
        setStatus(prev => ({ ...prev, isScanning: true }));
        break;
      case 'scan_error':
        setStatus(prev => ({ ...prev, isScanning: false }));
        setProgress(0);
        break;
      case 'status_update':
        setStatus(msg.data);
        break;
      case 'interests_updated':
        setInterests(msg.data);
        break;
      case 'settings_updated':
        setSettings(msg.data);
        break;
      case 'logs_cleared':
        setLogs([]);
        break;
    }
  }

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  // ── API helpers ──
  const api = (path, opts = {}) =>
    fetch(import.meta.env.DEV ? `http://localhost:3001${path}` : path, {
      headers: { 'Content-Type': 'application/json' },
      ...opts
    });

  const triggerScan    = ()           => api('/api/scan', { method: 'POST' }).then(r => r.ok);
  const clearLogs      = ()           => api('/api/logs', { method: 'DELETE' });
  const deleteSummary  = (id)         => api(`/api/summaries/${id}`, { method: 'DELETE' });
  const removeInterest = (id)         => api(`/api/interests/${id}`, { method: 'DELETE' });
  const addInterest    = async (topic) => {
    const r = await api('/api/interests', { method: 'POST', body: JSON.stringify({ topic }) });
    if (!r.ok) throw new Error((await r.json()).error);
  };
  const toggleInterest = (id, enabled) =>
    api(`/api/interests/${id}`, { method: 'PATCH', body: JSON.stringify({ enabled }) });
  const saveSetting    = (key, value) =>
    api('/api/settings', { method: 'POST', body: JSON.stringify({ key, value }) });

  return {
    connected, logs, summaries, interests, settings, status, progress,
    triggerScan, addInterest, toggleInterest, removeInterest,
    saveSetting, deleteSummary, clearLogs
  };
}
