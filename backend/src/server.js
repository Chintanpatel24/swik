const express  = require('express');
const http     = require('http');
const { WebSocketServer } = require('ws');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');
const { v4: uuid } = require('uuid');

const config   = require('./config');
const { agentOps, taskOps, msgOps, settingsOps } = require('./db');
const { orchestrateTask }  = require('./agents/orchestrator');
const { checkProvider, callAI } = require('./agents/aiRunner');
const { webSearch }        = require('./tools/webSearch');
const { fsTool }           = require('./tools/fileSystem');

const app = express();
const srv = http.createServer(app);
const wss = new WebSocketServer({ server: srv });

// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// Serve built frontend in production / Docker
const distPath = path.join(__dirname, '../../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// ── WebSocket ─────────────────────────────────────────────────
function broadcast(msg) {
  const p = JSON.stringify(msg);
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(p); });
}

wss.on('connection', ws => {
  ws.send(JSON.stringify({
    type: 'init',
    data: {
      agents:   agentOps.getAll(),
      tasks:    taskOps.getAll(),
      messages: msgOps.getRecent(150),
      settings: settingsOps.getAll(),
      config: {
        defaultProvider: config.ai.defaultProvider,
        defaultModel:    config.ai.defaultModel,
        isDesktop:       config.isDesktop,
      },
    },
  }));
  ws.on('error', e => console.error('[WS]', e.message));
});

// ── AGENTS ────────────────────────────────────────────────────
app.get('/api/agents', (_, res) => res.json(agentOps.getAll()));

app.post('/api/agents', (req, res) => {
  const d = req.body;
  const agent = {
    id:           uuid(),
    name:         d.name          || 'Agent',
    role:         d.role          || 'developer',
    color:        d.color         || '#4f8ef7',
    floor:        d.floor         || 1,
    desk_index:   d.desk_index    || 0,
    model:        d.model         || config.ai.defaultModel,
    provider:     d.provider      || config.ai.defaultProvider,
    api_url:      d.api_url       || config.ai.ollama.url,
    api_key:      d.api_key       || null,
    system_prompt:d.system_prompt || '',
    skills:       d.skills        || [],
  };
  agentOps.create(agent);
  const created = agentOps.getById(agent.id);
  broadcast({ type: 'agent_created', data: created });
  res.json(created);
});

app.put('/api/agents/:id', (req, res) => {
  agentOps.update(req.params.id, req.body);
  const u = agentOps.getById(req.params.id);
  broadcast({ type: 'agent_updated', data: u });
  res.json(u);
});

app.delete('/api/agents/:id', (req, res) => {
  agentOps.delete(req.params.id);
  broadcast({ type: 'agent_deleted', data: { id: req.params.id } });
  res.json({ ok: true });
});

// ── TASKS ─────────────────────────────────────────────────────
app.get('/api/tasks', (_, res) => res.json(taskOps.getAll()));

app.post('/api/tasks', async (req, res) => {
  const d    = req.body;
  const task = { id: uuid(), title: d.title||'Task', description: d.description||'' };
  taskOps.create(task);
  const created = taskOps.getById(task.id);
  broadcast({ type: 'task_created', data: created });
  res.json({ ok: true, taskId: task.id });

  orchestrateTask(task.id, broadcast).catch(e => {
    taskOps.update(task.id, { ...task, status: 'error', result: e.message });
    broadcast({ type: 'task_update', data: taskOps.getById(task.id) });
  });
});

app.delete('/api/tasks/:id', (req, res) => {
  taskOps.delete(req.params.id);
  broadcast({ type: 'task_deleted', data: { id: req.params.id } });
  res.json({ ok: true });
});

app.get('/api/tasks/:id/messages', (req, res) =>
  res.json(msgOps.getByTask(req.params.id)));

// ── MESSAGES (direct chat) ────────────────────────────────────
app.get('/api/messages', (_, res) => res.json(msgOps.getRecent(150)));

app.post('/api/messages', async (req, res) => {
  const { to_agent, content } = req.body;
  const agent = agentOps.getById(to_agent);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const userMsg = { id: uuid(), from_agent: 'user', to_agent, content, type: 'user' };
  msgOps.create(userMsg);
  broadcast({ type: 'new_message', data: { ...userMsg, from_agent_name: 'You' } });
  res.json({ ok: true });

  broadcast({ type: 'agent_status', data: { agentId: to_agent, status: 'thinking', message: 'composing reply…' } });
  try {
    const reply = await callAI(agent, [
      { role: 'system', content: agent.system_prompt || `You are ${agent.name}.` },
      { role: 'user',   content },
    ]);
    const rm = { id: uuid(), from_agent: to_agent, to_agent: 'user', content: reply, type: 'chat' };
    msgOps.create(rm);
    broadcast({ type: 'new_message', data: { ...rm, from_agent_name: agent.name } });
  } catch (e) {
    const em = { id: uuid(), from_agent: to_agent, to_agent: 'user', content: `(AI error: ${e.message})`, type: 'error' };
    msgOps.create(em);
    broadcast({ type: 'new_message', data: { ...em, from_agent_name: agent.name } });
  }
  broadcast({ type: 'agent_status', data: { agentId: to_agent, status: 'idle' } });
});

// ── WORKSPACE ─────────────────────────────────────────────────
app.get('/api/workspace/:agentId', (req, res) =>
  res.json(fsTool.list(req.params.agentId, req.query.taskId || 'general')));

app.get('/api/workspace/:agentId/file', (req, res) =>
  res.json(fsTool.read(req.params.agentId, req.query.taskId||'general', req.query.path)));

// ── SETTINGS ─────────────────────────────────────────────────
app.get('/api/settings', (_, res) => res.json(settingsOps.getAll()));
app.post('/api/settings', (req, res) => {
  const { key, value } = req.body;
  settingsOps.set(key, value);
  broadcast({ type: 'settings_updated', data: settingsOps.getAll() });
  res.json({ ok: true });
});

// ── AI STATUS ─────────────────────────────────────────────────
app.get('/api/ai/status', async (req, res) => {
  const provider = req.query.provider || config.ai.defaultProvider;
  const url      = req.query.url      || config.ai.ollama.url;
  const apiKey   = req.query.key      || '';
  const model    = req.query.model    || config.ai.defaultModel;
  const result   = await checkProvider(provider, url, apiKey, model);
  res.json(result);
});

// ── SEARCH ────────────────────────────────────────────────────
app.post('/api/search', async (req, res) => {
  const result = await webSearch(req.body.query, req.body.maxResults || 5);
  res.json(result);
});

// ── HEALTH ───────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({
  ok: true, uptime: Math.floor(process.uptime()),
  agents: agentOps.getAll().length,
  dataDir: config.dataDir,
  version: '1.0.0',
}));

// SPA fallback — serves React app for all non-API routes (web mode)
if (fs.existsSync(distPath)) {
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// ── Start ─────────────────────────────────────────────────────
srv.listen(config.port, () => {
  console.log(`\n⬡  SWIK — AI Agent Headquarters`);
  console.log(`   Backend  →  http://localhost:${config.port}`);
  console.log(`   WebSocket→  ws://localhost:${config.port}`);
  console.log(`   Data Dir →  ${config.dataDir}`);
  console.log(`   Mode     →  ${config.isDesktop ? 'Desktop (Electron)' : 'Web'}`);
  if (fs.existsSync(distPath)) console.log(`   Frontend →  http://localhost:${config.port} (served from dist/)`);
  console.log('');
});
