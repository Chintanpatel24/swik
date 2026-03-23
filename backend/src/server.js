import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { config } from './config.js';
import {
  getSummaries, getLogs, getSummaryCount, deleteSummary, clearLogs,
  getInterests, addInterest, updateInterest, deleteInterest,
  getAllSettings, setSetting, getStats
} from './db.js';
import { startScheduler, runScan, getAgentStatus, setBroadcast, reschedule } from './agent.js';
import { checkOllamaReady } from './ai.js';

const app    = express();
const server = createServer(app);
const wss    = new WebSocketServer({ server });

// ── MIDDLEWARE ──
app.use(cors({ origin: config.server.frontendUrl }));
app.use(express.json());

// ── WEBSOCKET ──
function broadcast(message) {
  const payload = JSON.stringify(message);
  wss.clients.forEach(client => { if (client.readyState === 1) client.send(payload); });
}
setBroadcast(broadcast);

wss.on('connection', (ws) => {
  console.log('[WS] Client connected');
  ws.send(JSON.stringify({
    type: 'init',
    data: {
      status:    getAgentStatus(),
      logs:      getLogs(150),
      summaries: getSummaries(20),
      interests: getInterests(),
      settings:  getAllSettings()
    }
  }));
  ws.on('close', () => console.log('[WS] Client disconnected'));
  ws.on('error', (err) => console.error('[WS] Error:', err.message));
});

// ── REST API ──

app.get('/api/health', (_, res) =>
  res.json({ ok: true, uptime: process.uptime(), timestamp: new Date().toISOString() }));

app.get('/api/status', (_, res) => res.json(getAgentStatus()));

app.get('/api/ollama', async (_, res) => res.json(await checkOllamaReady()));

// Summaries
app.get('/api/summaries', (req, res) =>
  res.json(getSummaries(parseInt(req.query.limit) || 50)));

app.delete('/api/summaries/:id', (req, res) => {
  deleteSummary(parseInt(req.params.id));
  broadcast({ type: 'summary_deleted', data: { id: parseInt(req.params.id) } });
  res.json({ ok: true });
});

// Logs
app.get('/api/logs', (req, res) =>
  res.json(getLogs(parseInt(req.query.limit) || 200)));

app.delete('/api/logs', (_, res) => {
  clearLogs();
  broadcast({ type: 'logs_cleared' });
  res.json({ ok: true });
});

// Trigger scan
app.post('/api/scan', (req, res) => {
  if (getAgentStatus().isScanning) return res.status(409).json({ error: 'Scan already in progress' });
  runScan();
  res.json({ ok: true, message: 'Scan triggered' });
});

// ── INTERESTS ──
app.get('/api/interests', (_, res) => res.json(getInterests()));

app.post('/api/interests', (req, res) => {
  const { topic } = req.body;
  if (!topic?.trim()) return res.status(400).json({ error: 'Topic required' });
  try {
    const result = addInterest(topic);
    const newInterest = { id: result.lastInsertRowid, topic: topic.trim(), enabled: 1 };
    broadcast({ type: 'interests_updated', data: getInterests() });
    res.json(newInterest);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/interests/:id', (req, res) => {
  const { enabled } = req.body;
  updateInterest(parseInt(req.params.id), enabled);
  broadcast({ type: 'interests_updated', data: getInterests() });
  res.json({ ok: true });
});

app.delete('/api/interests/:id', (req, res) => {
  deleteInterest(parseInt(req.params.id));
  broadcast({ type: 'interests_updated', data: getInterests() });
  res.json({ ok: true });
});

// ── SETTINGS ──
app.get('/api/settings', (_, res) => res.json(getAllSettings()));

app.post('/api/settings', (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: 'Key required' });
  setSetting(key, value);

  // Apply live changes
  if (key === 'scanInterval' && typeof value === 'number' && value >= 5) {
    reschedule(value);
    broadcast({ type: 'status_update', data: getAgentStatus() });
  }

  broadcast({ type: 'settings_updated', data: getAllSettings() });
  res.json({ ok: true });
});

// ── STATS ──
app.get('/api/stats', (_, res) => res.json(getStats()));

// ── START ──
server.listen(config.server.port, () => {
  console.log(`\n🚀 TechScan Backend  →  http://localhost:${config.server.port}`);
  console.log(`📡 WebSocket         →  ws://localhost:${config.server.port}`);
  console.log(`🤖 AI Engine         →  Ollama (${config.ollama.model})`);
  console.log(`🗄️  Database          →  ./data/techscan.db\n`);
  startScheduler();
});
