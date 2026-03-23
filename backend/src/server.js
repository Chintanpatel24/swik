// backend/src/server.js
const express  = require('express');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const cors     = require('cors');
const { v4: uuidv4 } = require('uuid');
const { agentOps, taskOps, msgOps, workspaceOps } = require('./db');
const { orchestrateTask } = require('./agents/orchestrator');
const { webSearch }       = require('./tools/webSearch');
const { fsTool }          = require('./tools/fileSystem');

const PORT = parseInt(process.env.BACKEND_PORT || '7842', 10);
const app  = express();
const srv  = createServer(app);
const wss  = new WebSocketServer({ server: srv });

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// ── WEBSOCKET BROADCAST ────────────────────────────────────────────────────
function broadcast(msg) {
  const payload = JSON.stringify(msg);
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(payload); });
}

wss.on('connection', (ws) => {
  // Send full init payload
  ws.send(JSON.stringify({
    type: 'init',
    data: {
      agents:   agentOps.getAll(),
      tasks:    taskOps.getAll(),
      messages: msgOps.getRecent(100)
    }
  }));
  ws.on('error', console.error);
});

// ── AGENTS ─────────────────────────────────────────────────────────────────
app.get('/api/agents', (_, res) => res.json(agentOps.getAll()));

app.post('/api/agents', (req, res) => {
  const agent = { id: uuidv4(), ...req.body };
  agentOps.create(agent);
  const created = agentOps.getById(agent.id);
  broadcast({ type: 'agent_created', data: created });
  res.json(created);
});

app.put('/api/agents/:id', (req, res) => {
  agentOps.update(req.params.id, req.body);
  const updated = agentOps.getById(req.params.id);
  broadcast({ type: 'agent_updated', data: updated });
  res.json(updated);
});

app.delete('/api/agents/:id', (req, res) => {
  agentOps.delete(req.params.id);
  broadcast({ type: 'agent_deleted', data: { id: req.params.id } });
  res.json({ ok: true });
});

app.patch('/api/agents/:id/position', (req, res) => {
  const { x, y } = req.body;
  agentOps.updatePos(req.params.id, x, y);
  broadcast({ type: 'agent_moved', data: { id: req.params.id, x, y } });
  res.json({ ok: true });
});

// ── TASKS ──────────────────────────────────────────────────────────────────
app.get('/api/tasks', (_, res) => res.json(taskOps.getAll()));

app.post('/api/tasks', async (req, res) => {
  const task = { id: uuidv4(), ...req.body };
  taskOps.create(task);
  broadcast({ type: 'task_created', data: taskOps.getById(task.id) });
  res.json({ ok: true, taskId: task.id });

  // Run orchestration async
  orchestrateTask(task.id, broadcast).catch(e => {
    console.error('[Orchestrator]', e.message);
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

// ── MESSAGES ───────────────────────────────────────────────────────────────
app.get('/api/messages', (_, res) => res.json(msgOps.getRecent(100)));

// User can send a message directly to an agent
app.post('/api/messages', async (req, res) => {
  const { to_agent, content } = req.body;
  const agent = agentOps.getById(to_agent);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const userMsg = { id: uuidv4(), from_agent: 'user', to_agent, content, type: 'user' };
  msgOps.create(userMsg);
  broadcast({ type: 'new_message', data: { ...userMsg, from_agent_name: 'You' } });

  res.json({ ok: true });

  // Agent replies async
  broadcast({ type: 'agent_status', data: { agentId: to_agent, status: 'thinking' } });
  try {
    const { callAI } = require('./agents/aiRunner');
    const reply = await callAI(agent, [
      { role: 'system', content: agent.system_prompt },
      { role: 'user',   content }
    ]);
    const replyMsg = { id: uuidv4(), from_agent: to_agent, to_agent: 'user', content: reply, type: 'chat' };
    msgOps.create(replyMsg);
    broadcast({ type: 'new_message', data: { ...replyMsg, from_agent_name: agent.name } });
  } catch (e) {
    console.error('[Chat]', e.message);
  }
  broadcast({ type: 'agent_status', data: { agentId: to_agent, status: 'idle' } });
});

// ── WORKSPACE ──────────────────────────────────────────────────────────────
app.get('/api/workspace/:agentId', (req, res) => {
  const files = fsTool.list(req.params.agentId, req.query.taskId || 'general');
  res.json(files);
});

app.get('/api/workspace/:agentId/file', (req, res) => {
  const result = fsTool.read(req.params.agentId, req.query.taskId || 'general', req.query.path);
  res.json(result);
});

// ── SEARCH (direct tool access) ────────────────────────────────────────────
app.post('/api/search', async (req, res) => {
  const result = await webSearch(req.body.query, req.body.maxResults || 5);
  res.json(result);
});

// ── HEALTH ─────────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ ok: true, uptime: process.uptime() }));

srv.listen(PORT, () => {
  console.log(`[AgentOffice Backend] http://localhost:${PORT}`);
  console.log(`[AgentOffice Backend] Data: ${process.env.AGENT_DATA_DIR}`);
});
