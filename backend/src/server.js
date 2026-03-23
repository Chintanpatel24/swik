const express  = require('express');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const cors     = require('cors');
const { v4: uuidv4 } = require('uuid');
const { agentOps, taskOps, msgOps } = require('./db');
const { orchestrateTask }  = require('./agents/orchestrator');
const { webSearch }        = require('./tools/webSearch');
const { fsTool }           = require('./tools/fileSystem');

const PORT = parseInt(process.env.BACKEND_PORT || '7842', 10);
const app  = express();
const srv  = createServer(app);
const wss  = new WebSocketServer({ server: srv });

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// ── WebSocket ──────────────────────────────────────────────────
function broadcast(msg) {
  const payload = JSON.stringify(msg);
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(payload); });
}

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({
    type: 'init',
    data: {
      agents:   agentOps.getAll(),
      tasks:    taskOps.getAll(),
      messages: msgOps.getRecent(100)
    }
  }));
  ws.on('error', (e) => console.error('[WS]', e.message));
});

// ── AGENTS ────────────────────────────────────────────────────
app.get('/api/agents', (_, res) => res.json(agentOps.getAll()));

app.post('/api/agents', (req, res) => {
  const data  = req.body;
  const agent = {
    id:            uuidv4(),
    name:          data.name          || 'Agent',
    role:          data.role          || 'developer',
    avatar:        data.avatar        || 'default',
    color:         data.color         || '#4f8ef7',
    model:         data.model         || 'llama3.2',
    api_type:      data.api_type      || 'ollama',
    api_url:       data.api_url       || 'http://localhost:11434',
    api_key:       data.api_key       || null,
    system_prompt: data.system_prompt || '',
    skills:        Array.isArray(data.skills) ? data.skills : (data.skills || []),
    desk_x:        data.desk_x        || 300,
    desk_y:        data.desk_y        || 300,
    enabled:       data.enabled ?? 1,
  };
  agentOps.create(agent);
  const created = agentOps.getById(agent.id);
  broadcast({ type: 'agent_created', data: created });
  res.json(created);
});

app.put('/api/agents/:id', (req, res) => {
  const data = req.body;
  // Ensure skills is always stored as a JSON array string
  if (Array.isArray(data.skills)) {
    // already array — db layer will stringify
  }
  agentOps.update(req.params.id, data);
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

// ── TASKS ─────────────────────────────────────────────────────
app.get('/api/tasks', (_, res) => res.json(taskOps.getAll()));

app.post('/api/tasks', async (req, res) => {
  const task = {
    id:          uuidv4(),
    title:       req.body.title       || 'Task',
    description: req.body.description || '',
    created_by:  req.body.created_by  || 'user',
  };
  taskOps.create(task);
  const created = taskOps.getById(task.id);
  broadcast({ type: 'task_created', data: created });
  res.json({ ok: true, taskId: task.id });

  // Run async — don't await
  orchestrateTask(task.id, broadcast).catch(err => {
    console.error('[Orchestrator]', err.message);
    taskOps.update(task.id, { ...task, status: 'error', result: err.message });
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

// ── MESSAGES ──────────────────────────────────────────────────
app.get('/api/messages', (_, res) => res.json(msgOps.getRecent(100)));

app.post('/api/messages', async (req, res) => {
  const { to_agent, content } = req.body;
  const agent = agentOps.getById(to_agent);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const userMsg = { id: uuidv4(), from_agent: 'user', to_agent, content, type: 'user' };
  msgOps.create(userMsg);
  broadcast({ type: 'new_message', data: { ...userMsg, from_agent_name: 'You' } });
  res.json({ ok: true });

  // Async agent reply
  broadcast({ type: 'agent_status', data: { agentId: to_agent, status: 'thinking', message: 'composing reply…' } });
  try {
    const { callAI } = require('./agents/aiRunner');
    const reply = await callAI(agent, [
      { role: 'system', content: agent.system_prompt || `You are ${agent.name}.` },
      { role: 'user',   content }
    ]);
    const replyMsg = { id: uuidv4(), from_agent: to_agent, to_agent: 'user', content: reply, type: 'chat' };
    msgOps.create(replyMsg);
    broadcast({ type: 'new_message', data: { ...replyMsg, from_agent_name: agent.name } });
  } catch (e) {
    console.error('[Chat]', e.message);
    const errMsg = { id: uuidv4(), from_agent: to_agent, to_agent: 'user',
      content: `(AI error: ${e.message})`, type: 'error' };
    msgOps.create(errMsg);
    broadcast({ type: 'new_message', data: { ...errMsg, from_agent_name: agent.name } });
  }
  broadcast({ type: 'agent_status', data: { agentId: to_agent, status: 'idle' } });
});

// ── WORKSPACE ─────────────────────────────────────────────────
app.get('/api/workspace/:agentId', (req, res) => {
  const result = fsTool.list(req.params.agentId, req.query.taskId || 'general');
  res.json(result);
});

app.get('/api/workspace/:agentId/file', (req, res) => {
  const result = fsTool.read(req.params.agentId, req.query.taskId || 'general', req.query.path);
  res.json(result);
});

// ── SEARCH ────────────────────────────────────────────────────
app.post('/api/search', async (req, res) => {
  const result = await webSearch(req.body.query, req.body.maxResults || 5);
  res.json(result);
});

// ── HEALTH ────────────────────────────────────────────────────
app.get('/api/health', (_, res) =>
  res.json({ ok: true, uptime: Math.floor(process.uptime()), agents: agentOps.getAll().length }));

// ── START ─────────────────────────────────────────────────────
srv.listen(PORT, () => {
  console.log(`\n⬡  AgentOffice Backend`);
  console.log(`   HTTP  →  http://localhost:${PORT}`);
  console.log(`   WS    →  ws://localhost:${PORT}`);
  console.log(`   Data  →  ${process.env.AGENT_DATA_DIR || './data'}\n`);
});
