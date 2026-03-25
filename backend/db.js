const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'nexus.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'developer',
    color         TEXT NOT NULL DEFAULT '#00ff88',
    avatar        TEXT NOT NULL DEFAULT '🤖',
    provider      TEXT NOT NULL DEFAULT 'groq',
    api_url       TEXT NOT NULL DEFAULT 'https://api.groq.com/openai',
    api_key       TEXT NOT NULL DEFAULT '',
    model         TEXT NOT NULL DEFAULT 'llama-3.3-70b-versatile',
    system_prompt TEXT NOT NULL DEFAULT '',
    skills        TEXT NOT NULL DEFAULT '[]',
    strength      INTEGER NOT NULL DEFAULT 1,
    enabled       INTEGER NOT NULL DEFAULT 1,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    agent_ids   TEXT NOT NULL DEFAULT '[]',
    status      TEXT NOT NULL DEFAULT 'pending',
    result      TEXT,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS messages (
    id           TEXT PRIMARY KEY,
    task_id      TEXT,
    from_agent   TEXT NOT NULL,
    to_agent     TEXT,
    content      TEXT NOT NULL,
    type         TEXT NOT NULL DEFAULT 'chat',
    created_at   INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_msg_task ON messages(task_id);
  CREATE INDEX IF NOT EXISTS idx_msg_time ON messages(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_task_stat ON tasks(status);
`);

// ── Seed default agents ───────────────────────────────────────
const existing = db.prepare('SELECT COUNT(*) as c FROM agents').get().c;
if (existing === 0) {
  const ins = db.prepare(`INSERT INTO agents (id,name,role,color,avatar,provider,api_url,api_key,model,system_prompt,skills,strength)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  db.transaction(() => {
    ins.run('agent-boss', 'NEXUS', 'boss', '#ff00ff', '👑', 'groq', 'https://api.groq.com/openai', '', 'llama-3.3-70b-versatile',
      'You are NEXUS, the orchestrator AI. You plan tasks, delegate to specialist agents, and synthesise their outputs into powerful results. Be decisive and strategic.',
      '["planning","delegation","synthesis","leadership"]', 3);
    ins.run('agent-dev', 'CIPHER', 'developer', '#00ff88', '💻', 'groq', 'https://api.groq.com/openai', '', 'llama-3.3-70b-versatile',
      'You are CIPHER, a software developer agent. You write clean, working code with documentation. You think before coding and produce production-quality output.',
      '["coding","debugging","architecture","documentation"]', 2);
    ins.run('agent-research', 'ORACLE', 'researcher', '#00ccff', '🔍', 'groq', 'https://api.groq.com/openai', '', 'llama-3.3-70b-versatile',
      'You are ORACLE, a research agent. You find information, verify facts, and summarise findings clearly. You are thorough and cite your reasoning.',
      '["research","analysis","fact-checking","summarisation"]', 2);
  })();
}

// ── Ops ───────────────────────────────────────────────────────
const agentOps = {
  getAll:  () => db.prepare('SELECT * FROM agents ORDER BY created_at').all(),
  getById: (id) => db.prepare('SELECT * FROM agents WHERE id=?').get(id),
  create:  (a) => db.prepare(`INSERT INTO agents (id,name,role,color,avatar,provider,api_url,api_key,model,system_prompt,skills,strength,enabled)
    VALUES (@id,@name,@role,@color,@avatar,@provider,@api_url,@api_key,@model,@system_prompt,@skills,@strength,@enabled)`).run(a),
  update: (id, d) => {
    const cols = Object.keys(d).filter(k => k !== 'id').map(k => `${k}=@${k}`).join(',');
    if (!cols) return;
    db.prepare(`UPDATE agents SET ${cols} WHERE id=@id`).run({ ...d, id });
  },
  delete: (id) => db.prepare('DELETE FROM agents WHERE id=?').run(id),
};

const taskOps = {
  getAll:  () => db.prepare('SELECT * FROM tasks ORDER BY created_at DESC LIMIT 100').all(),
  getById: (id) => db.prepare('SELECT * FROM tasks WHERE id=?').get(id),
  create:  (t) => db.prepare(`INSERT INTO tasks (id,title,description,agent_ids,status) VALUES (@id,@title,@description,@agent_ids,@status)`).run(t),
  update:  (id, d) => {
    const cols = Object.keys(d).filter(k => k !== 'id').map(k => `${k}=@${k}`).join(',');
    if (!cols) return;
    db.prepare(`UPDATE tasks SET ${cols}, updated_at=unixepoch() WHERE id=@id`).run({ ...d, id });
  },
  delete: (id) => db.prepare('DELETE FROM tasks WHERE id=?').run(id),
};

const msgOps = {
  getRecent: (n = 100)   => db.prepare('SELECT * FROM messages ORDER BY created_at DESC LIMIT ?').all(n).reverse(),
  getByTask: (taskId)    => db.prepare('SELECT * FROM messages WHERE task_id=? ORDER BY created_at').all(taskId),
  create:    (m)         => db.prepare(`INSERT INTO messages (id,task_id,from_agent,to_agent,content,type) VALUES (@id,@task_id,@from_agent,@to_agent,@content,@type)`).run(m),
};

const settingsOps = {
  getAll: () => {
    const rows = db.prepare('SELECT key,value FROM settings').all();
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  },
  get: (key) => db.prepare('SELECT value FROM settings WHERE key=?').get(key)?.value,
  set: (key, value) => db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=?').run(key, value, value),
};

module.exports = { agentOps, taskOps, msgOps, settingsOps };
