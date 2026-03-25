/**
 * NEXUS Backend Server
 * Express + WebSocket + SQLite — port 3001
 * Inspired by SWIK (MIT) and MiroFish (MIT)
 */

const express  = require('express');
const http     = require('http');
const { WebSocketServer } = require('ws');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');
const fetch    = require('node-fetch');
const { v4: uuid } = require('uuid');
const { agentOps, taskOps, msgOps, settingsOps } = require('./db');

const PORT      = process.env.PORT       || 3001;
const PYTHON_URL = process.env.PYTHON_URL || 'http://localhost:8765';

const app = express();
const srv = http.createServer(app);
const wss = new WebSocketServer({ server: srv });

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// Serve built frontend if it exists
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// ── WebSocket broadcast ───────────────────────────────────────
function broadcast(msg) {
  const p = JSON.stringify(msg);
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(p); });
}

wss.on('connection', ws => {
  console.log('[WS] Client connected');
  ws.send(JSON.stringify({
    type: 'init',
    data: {
      agents:   agentOps.getAll(),
      tasks:    taskOps.getAll(),
      messages: msgOps.getRecent(100),
      settings: settingsOps.getAll(),
    },
  }));
  ws.on('error', e => console.error('[WS]', e.message));
  ws.on('close', () => console.log('[WS] Client disconnected'));
});

// ── AGENTS ───────────────────────────────────────────────────
app.get('/api/agents', (_, res) => res.json(agentOps.getAll()));

app.post('/api/agents', (req, res) => {
  const d = req.body;
  const agent = {
    id:           uuid(),
    name:         d.name          || 'Agent',
    role:         d.role          || 'developer',
    color:        d.color         || '#00ff88',
    avatar:       d.avatar        || '🤖',
    provider:     d.provider      || 'groq',
    api_url:      d.api_url       || 'https://api.groq.com/openai',
    api_key:      d.api_key       || '',
    model:        d.model         || 'llama-3.3-70b-versatile',
    system_prompt: d.system_prompt || `You are ${d.name || 'Agent'}, an AI assistant.`,
    skills:       JSON.stringify(Array.isArray(d.skills) ? d.skills : []),
    strength:     d.strength      || 1,
    enabled:      1,
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

// ── AI STATUS CHECK ──────────────────────────────────────────
app.get('/api/ai/check', async (req, res) => {
  const { provider, url, key, model } = req.query;
  try {
    if (provider === 'ollama') {
      const r = await fetch(`${url}/api/tags`, { timeout: 5000 });
      if (!r.ok) return res.json({ ok: false, error: `HTTP ${r.status}` });
      const d = await r.json();
      return res.json({ ok: true, models: (d.models || []).map(m => m.name) });
    }
    const endpoint = `${(url || '').replace(/\/$/, '')}/v1/models`;
    const headers  = {};
    if (key) headers['Authorization'] = `Bearer ${key}`;
    const r = await fetch(endpoint, { headers, timeout: 8000 });
    if (!r.ok) return res.json({ ok: false, error: `HTTP ${r.status}` });
    const d = await r.json();
    const models = (d.data || []).map(m => m.id).slice(0, 20);
    return res.json({ ok: true, models });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// ── TASKS ────────────────────────────────────────────────────
app.get('/api/tasks', (_, res) => res.json(taskOps.getAll()));

app.post('/api/tasks', async (req, res) => {
  const d    = req.body;
  const task = {
    id:          uuid(),
    title:       d.title || 'Task',
    description: d.description || '',
    agent_ids:   JSON.stringify(d.agent_ids || []),
    status:      'pending',
    result:      null,
  };
  taskOps.create(task);
  const created = taskOps.getById(task.id);
  broadcast({ type: 'task_created', data: created });
  res.json(created);

  // Run task immediately
  runTask(task.id, d.agent_ids || []).catch(e => console.error('[Task]', e.message));
});

app.delete('/api/tasks/:id', (req, res) => {
  taskOps.delete(req.params.id);
  broadcast({ type: 'task_deleted', data: { id: req.params.id } });
  res.json({ ok: true });
});

app.get('/api/tasks/:id/messages', (req, res) => {
  res.json(msgOps.getByTask(req.params.id));
});

// ── MESSAGES ─────────────────────────────────────────────────
app.get('/api/messages', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json(msgOps.getRecent(limit));
});

// ── SETTINGS ─────────────────────────────────────────────────
app.get('/api/settings', (_, res) => res.json(settingsOps.getAll()));
app.put('/api/settings', (req, res) => {
  Object.entries(req.body).forEach(([k, v]) => settingsOps.set(k, v));
  res.json({ ok: true });
});

// ── CHAT (direct agent chat) ─────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { agent_id, message } = req.body;
  const agent = agentOps.getById(agent_id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  // Save user message
  const userMsg = {
    id: uuid(), task_id: null,
    from_agent: 'user', to_agent: agent_id,
    content: message, type: 'chat',
  };
  msgOps.create(userMsg);
  broadcast({ type: 'new_message', data: userMsg });

  // Stream response
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  try {
    const reply = await callAIDirect(agent, message, (tok) => {
      res.write(tok);
    });
    const botMsg = {
      id: uuid(), task_id: null,
      from_agent: agent_id, to_agent: 'user',
      content: reply, type: 'chat',
    };
    msgOps.create(botMsg);
    broadcast({ type: 'new_message', data: botMsg });
    res.end();
  } catch (e) {
    res.write(`\n[Error: ${e.message}]`);
    res.end();
  }
});

// ── PYTHON PROXY ──────────────────────────────────────────────
app.post('/api/python/run', async (req, res) => {
  try {
    const r = await fetch(`${PYTHON_URL}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(req.body),
      timeout: 120000,
    });
    const d = await r.json();
    res.json(d);
  } catch (e) {
    res.json({ ok: false, error: `Python server not available: ${e.message}` });
  }
});

app.get('/api/python/status', async (req, res) => {
  try {
    const r = await fetch(`${PYTHON_URL}/status`, { timeout: 3000 });
    const d = await r.json();
    res.json({ ok: true, ...d });
  } catch {
    res.json({ ok: false, message: 'Python agent server not running. Start it with: python agents/runner.py' });
  }
});

// Save a Python agent script
app.post('/api/python/save', (req, res) => {
  const { filename, code } = req.body;
  if (!filename || !code) return res.json({ ok: false, error: 'filename and code required' });
  const safe = filename.replace(/[^a-zA-Z0-9_.-]/g, '').replace(/\.\.+/g, '');
  if (!safe.endsWith('.py')) return res.json({ ok: false, error: 'Filename must end in .py' });
  const dest = path.join(__dirname, '../agents/user_agents', safe);
  try {
    fs.writeFileSync(dest, code, 'utf8');
    res.json({ ok: true, path: dest });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// Run custom Python agent via Python server
app.post('/api/python/run_custom/:file', async (req, res) => {
  try {
    const r = await fetch(`${PYTHON_URL}/run_custom/${req.params.file}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
      timeout: 60000,
    });
    const d = await r.json();
    res.json(d);
  } catch (e) {
    res.json({ ok: false, error: `Python server not available: ${e.message}` });
  }
});

app.get('/api/python/agents', async (req, res) => {
  try {
    const r = await fetch(`${PYTHON_URL}/agents`, { timeout: 5000 });
    const d = await r.json();
    res.json(d);
  } catch {
    res.json({ agents: [], error: 'Python server offline' });
  }
});

// ── FILES (workspace) ────────────────────────────────────────
const workspaceDir = path.join(__dirname, '../workspace');
if (!fs.existsSync(workspaceDir)) fs.mkdirSync(workspaceDir, { recursive: true });

app.get('/api/workspace', (_, res) => {
  const files = fs.existsSync(workspaceDir)
    ? fs.readdirSync(workspaceDir).map(f => ({
        name: f,
        size: fs.statSync(path.join(workspaceDir, f)).size,
        modified: fs.statSync(path.join(workspaceDir, f)).mtime,
      }))
    : [];
  res.json(files);
});

app.get('/api/workspace/:file', (req, res) => {
  const fp = path.join(workspaceDir, req.params.file.replace(/\.\./g, ''));
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
  res.send(fs.readFileSync(fp, 'utf8'));
});

// ── TASK RUNNER ───────────────────────────────────────────────
async function runTask(taskId, agentIds) {
  const task = taskOps.getById(taskId);
  if (!task) return;

  taskOps.update(taskId, { status: 'running' });
  broadcast({ type: 'task_update', data: taskOps.getById(taskId) });

  const agents = agentIds.map(id => agentOps.getById(id)).filter(Boolean);
  if (!agents.length) {
    taskOps.update(taskId, { status: 'failed', result: 'No agents assigned' });
    broadcast({ type: 'task_update', data: taskOps.getById(taskId) });
    return;
  }

  const saveMsg = (from, to, content, type = 'chat') => {
    const msg = { id: uuid(), task_id: taskId, from_agent: from?.id || from, to_agent: to?.id || to || null, content, type };
    msgOps.create(msg);
    broadcast({ type: 'new_message', data: { ...msg, from_agent_name: from?.name || from } });
    return msg;
  };

  try {
    // Try Python orchestrator first
    const pyStatus = await fetch(`${PYTHON_URL}/status`, { timeout: 2000 }).then(r => r.json()).catch(() => null);
    if (pyStatus?.ok) {
      const r = await fetch(`${PYTHON_URL}/orchestrate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ task, agents }),
        timeout: 120000,
      });
      const result = await r.json();
      if (result.ok) {
        (result.messages || []).forEach(m => saveMsg(m.from, m.to, m.content, m.type));
        taskOps.update(taskId, { status: 'done', result: result.result });
        broadcast({ type: 'task_update', data: taskOps.getById(taskId) });
        return;
      }
    }

    // JS fallback orchestrator
    await jsOrchestrate(taskId, task, agents, saveMsg);
  } catch (e) {
    taskOps.update(taskId, { status: 'failed', result: e.message });
    broadcast({ type: 'task_update', data: taskOps.getById(taskId) });
  }
}

async function jsOrchestrate(taskId, task, agents, saveMsg) {
  const boss    = agents.find(a => a.role === 'boss') || agents[0];
  const workers = agents.filter(a => a.id !== boss.id);

  // Boss plans
  broadcast({ type: 'agent_status', data: { agentId: boss.id, status: 'thinking', message: 'Planning task…' } });
  saveMsg(boss, null, `Starting task: "${task.title}"`, 'system');

  let plan = '';
  const workerList = workers.map(w => `- ${w.name} (${w.role})`).join('\n');
  try {
    plan = await callAIDirect(boss, `Task: "${task.title}"\nDetails: ${task.description}\n\nTeam:\n${workerList}\n\nRespond ONLY with JSON: {"plan":"brief plan","subtasks":[{"assignee":"name","instruction":"specific task"}]}`);
    saveMsg(boss, null, plan, 'planning');
  } catch (e) {
    plan = JSON.stringify({ plan: task.description, subtasks: workers.slice(0,2).map(w => ({ assignee: w.name, instruction: task.description })) });
  }

  // Parse subtasks
  let subtasks = [];
  try { const j = plan.match(/\{[\s\S]*\}/)?.[0]; if (j) subtasks = JSON.parse(j).subtasks || []; } catch {}
  if (!subtasks.length) subtasks = workers.map(w => ({ assignee: w.name, instruction: task.description }));

  broadcast({ type: 'agent_status', data: { agentId: boss.id, status: 'idle' } });

  // Workers execute
  const results = await Promise.all(subtasks.map(async sub => {
    const worker = workers.find(w => w.name.toLowerCase() === sub.assignee?.toLowerCase()) || workers[0] || boss;
    if (!worker) return null;
    saveMsg(boss, worker, `${worker.name}: ${sub.instruction}`, 'delegation');
    broadcast({ type: 'agent_status', data: { agentId: worker.id, status: 'working', message: sub.instruction.slice(0, 60) } });
    try {
      const resp = await callAIDirect(worker, `Task: ${sub.instruction}\nBe thorough and produce real output.`);
      saveMsg(worker, boss, resp.slice(0, 1000), 'result');
      broadcast({ type: 'agent_status', data: { agentId: worker.id, status: 'idle' } });
      return { agent: worker.name, response: resp };
    } catch (e) {
      broadcast({ type: 'agent_status', data: { agentId: worker.id, status: 'idle' } });
      return { agent: worker.name, error: e.message };
    }
  }));

  // Boss synthesises — MiroFish strength multiplication
  const strength   = agents.reduce((s, a) => s + (a.strength || 1), 0);
  const combined   = results.filter(Boolean).map(r => `**${r.agent}**: ${r.response || r.error}`).join('\n\n');
  let final = combined;

  if (workers.length > 0) {
    broadcast({ type: 'agent_status', data: { agentId: boss.id, status: 'thinking', message: 'Synthesising…' } });
    try {
      final = await callAIDirect(boss, `Synthesise these results into a single excellent response. Agent strength multiplier: ${strength}x.\n\nResults:\n${combined}\n\nOriginal task: ${task.description}`);
      saveMsg(boss, null, final.slice(0, 1000), 'synthesis');
    } catch {}
    broadcast({ type: 'agent_status', data: { agentId: boss.id, status: 'idle' } });
  }

  taskOps.update(taskId, { status: 'done', result: final });
  broadcast({ type: 'task_update', data: taskOps.getById(taskId) });
}

async function callAIDirect(agent, userMessage, onToken = null) {
  const provider = (agent.provider || 'groq').toLowerCase();
  const messages = [
    { role: 'system', content: agent.system_prompt || `You are ${agent.name}.` },
    { role: 'user',   content: userMessage },
  ];

  if (provider === 'ollama') {
    const url = `${(agent.api_url || 'http://localhost:11434').replace(/\/$/, '')}/api/chat`;
    const res  = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: agent.model, messages, stream: !!onToken, options: { temperature: 0.6, num_predict: 2048 } }),
    });
    if (!res.ok) throw new Error(`Ollama ${res.status}`);
    if (onToken) {
      let full = ''; const reader = res.body; let buf = '';
      for await (const chunk of reader) {
        buf += chunk.toString();
        const lines = buf.split('\n'); buf = lines.pop();
        for (const l of lines) {
          try { const j = JSON.parse(l); const t = j.message?.content || ''; if (t) { full += t; onToken(t); } } catch {}
        }
      }
      return full;
    }
    const d = await res.json();
    return d.message?.content || d.response || '';
  }

  // OpenAI-compatible
  const url  = `${(agent.api_url || 'https://api.groq.com/openai').replace(/\/$/, '')}/v1/chat/completions`;
  const hdrs = { 'Content-Type': 'application/json' };
  if (agent.api_key) hdrs['Authorization'] = `Bearer ${agent.api_key}`;

  const res = await fetch(url, {
    method:  'POST',
    headers: hdrs,
    body:    JSON.stringify({ model: agent.model, messages, stream: !!onToken, max_tokens: 2048, temperature: 0.6 }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`API ${res.status}: ${txt.slice(0, 200)}`);
  }
  if (onToken) {
    let full = ''; const reader = res.body; let buf = '';
    for await (const chunk of reader) {
      buf += chunk.toString();
      const lines = buf.split('\n'); buf = lines.pop();
      for (const l of lines) {
        if (!l.startsWith('data: ')) continue;
        const d = l.slice(6).trim();
        if (d === '[DONE]') continue;
        try { const t = JSON.parse(d).choices?.[0]?.delta?.content || ''; if (t) { full += t; onToken(t); } } catch {}
      }
    }
    return full;
  }
  const d = await res.json();
  return d.choices?.[0]?.message?.content || '';
}

// ── Catch-all for SPA ─────────────────────────────────────────
app.get('*', (req, res) => {
  const index = path.join(distPath, 'index.html');
  if (fs.existsSync(index)) res.sendFile(index);
  else res.json({ nexus: 'ok', port: PORT, frontend: 'Run npm start to launch frontend dev server' });
});

srv.listen(PORT, () => {
  console.log(`\n🔮 NEXUS Backend running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready`);
  console.log(`🐍 Python agent server expected at ${PYTHON_URL}`);
  console.log(`\nFrontend: http://localhost:5173 (dev) or http://localhost:${PORT} (built)\n`);
});
