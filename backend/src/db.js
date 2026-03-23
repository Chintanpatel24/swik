const Database = require('better-sqlite3');
const path     = require('path');
const config   = require('./config');

const DB_PATH = path.join(config.dataDir, 'swik.db');
const db      = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'developer',
    color         TEXT NOT NULL DEFAULT '#4f8ef7',
    floor         INTEGER NOT NULL DEFAULT 1,
    desk_index    INTEGER NOT NULL DEFAULT 0,
    model         TEXT NOT NULL DEFAULT 'llama3.2',
    provider      TEXT NOT NULL DEFAULT 'ollama',
    api_url       TEXT NOT NULL DEFAULT 'http://localhost:11434',
    api_key       TEXT,
    system_prompt TEXT NOT NULL DEFAULT '',
    skills        TEXT NOT NULL DEFAULT '[]',
    enabled       INTEGER NOT NULL DEFAULT 1,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id            TEXT PRIMARY KEY,
    title         TEXT NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    status        TEXT NOT NULL DEFAULT 'pending',
    assigned_to   TEXT,
    created_by    TEXT NOT NULL DEFAULT 'user',
    result        TEXT,
    floor         INTEGER,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS messages (
    id            TEXT PRIMARY KEY,
    task_id       TEXT,
    from_agent    TEXT NOT NULL,
    to_agent      TEXT,
    content       TEXT NOT NULL,
    type          TEXT NOT NULL DEFAULT 'chat',
    created_at    INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_msg_task  ON messages(task_id);
  CREATE INDEX IF NOT EXISTS idx_msg_time  ON messages(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_task_stat ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_agent_fl  ON agents(floor);
`);

// ── Normalise helpers ─────────────────────────────────────────
function toSkillsStr(skills) {
  if (!skills) return '[]';
  if (Array.isArray(skills)) return JSON.stringify(skills);
  try { JSON.parse(skills); return skills; } catch { return '[]'; }
}

// ── Seed 5 default agents across 3 floors ────────────────────
const existing = db.prepare('SELECT COUNT(*) as c FROM agents').get().c;
if (existing === 0) {
  const ins = db.prepare(`
    INSERT INTO agents (id,name,role,color,floor,desk_index,model,provider,api_url,system_prompt,skills)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `);
  db.transaction(() => {
    ins.run('agent-boss',   'Rex',   'boss',       '#f7c94f', 3, 0, 'llama3.2', 'ollama', 'http://localhost:11434',
      'You are Rex, the Boss. You sit on the top floor of the HQ. You break down tasks, delegate to the right agents, and synthesise results. Be decisive and concise.',
      JSON.stringify(['planning','delegation','synthesis','leadership']));

    ins.run('agent-dev',    'Nova',  'developer',  '#4f8ef7', 1, 0, 'llama3.2', 'ollama', 'http://localhost:11434',
      'You are Nova, a senior developer on Floor 1. You write clean, working code. You think before coding and document your work.',
      JSON.stringify(['Python','JavaScript','Node.js','React','debugging','architecture']));

    ins.run('agent-dev2',   'Axel',  'developer',  '#44aaff', 1, 1, 'llama3.2', 'ollama', 'http://localhost:11434',
      'You are Axel, a full-stack developer on Floor 1. You specialise in APIs, databases, and backend systems.',
      JSON.stringify(['Node.js','PostgreSQL','REST APIs','Docker','DevOps']));

    ins.run('agent-design', 'Pixel', 'designer',   '#f74faa', 2, 0, 'llama3.2', 'ollama', 'http://localhost:11434',
      'You are Pixel, a UI/UX designer on Floor 2. You create beautiful, user-friendly interfaces and design systems.',
      JSON.stringify(['UI design','UX','CSS','Tailwind','Figma','typography']));

    ins.run('agent-search', 'Scout', 'researcher', '#4ff7c4', 2, 1, 'llama3.2', 'ollama', 'http://localhost:11434',
      'You are Scout, a researcher on Floor 2. You search for information, verify facts, and provide well-sourced summaries.',
      JSON.stringify(['web search','research','summarisation','fact-checking','analysis']));
  })();
  console.log('[DB] Seeded 5 default agents across 3 floors');
}

// ── AGENTS ────────────────────────────────────────────────────
const agentOps = {
  getAll:  ()   => db.prepare('SELECT * FROM agents WHERE enabled=1 ORDER BY floor ASC, desk_index ASC').all(),
  getById: (id) => db.prepare('SELECT * FROM agents WHERE id=?').get(id),

  create: (a)   => db.prepare(`
    INSERT INTO agents (id,name,role,color,floor,desk_index,model,provider,api_url,api_key,system_prompt,skills,enabled)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(a.id, a.name, a.role||'developer', a.color||'#4f8ef7',
         a.floor||1, a.desk_index||0, a.model||'llama3.2',
         a.provider||'ollama', a.api_url||'http://localhost:11434',
         a.api_key||null, a.system_prompt||'', toSkillsStr(a.skills), 1),

  update: (id, a) => db.prepare(`
    UPDATE agents SET name=?,role=?,color=?,floor=?,desk_index=?,model=?,provider=?,api_url=?,api_key=?,system_prompt=?,skills=?,enabled=?
    WHERE id=?
  `).run(a.name, a.role, a.color, a.floor||1, a.desk_index||0,
         a.model, a.provider, a.api_url, a.api_key||null,
         a.system_prompt, toSkillsStr(a.skills), a.enabled??1, id),

  delete: (id) => db.prepare('DELETE FROM agents WHERE id=?').run(id),
};

// ── TASKS ─────────────────────────────────────────────────────
const taskOps = {
  getAll:  ()   => db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all(),
  getById: (id) => db.prepare('SELECT * FROM tasks WHERE id=?').get(id),

  create: (t) => db.prepare(
    'INSERT INTO tasks (id,title,description,status,created_by,floor) VALUES (?,?,?,?,?,?)'
  ).run(t.id, t.title, t.description||'', 'pending', t.created_by||'user', t.floor||null),

  update: (id, t) => db.prepare(
    'UPDATE tasks SET status=?,assigned_to=?,result=?,updated_at=unixepoch() WHERE id=?'
  ).run(t.status, t.assigned_to||null, t.result||null, id),

  delete: (id) => db.prepare('DELETE FROM tasks WHERE id=?').run(id),
};

// ── MESSAGES ──────────────────────────────────────────────────
const msgOps = {
  getByTask: (id) => db.prepare('SELECT * FROM messages WHERE task_id=? ORDER BY created_at ASC').all(id),
  getRecent: (n=150) => db.prepare('SELECT * FROM messages ORDER BY created_at DESC LIMIT ?').all(n).reverse(),
  create: (m) => db.prepare(
    'INSERT INTO messages (id,task_id,from_agent,to_agent,content,type) VALUES (?,?,?,?,?,?)'
  ).run(m.id, m.task_id||null, m.from_agent, m.to_agent||null, m.content, m.type||'chat'),
};

// ── SETTINGS ──────────────────────────────────────────────────
const settingsOps = {
  get:    (k, def=null) => { const r=db.prepare('SELECT value FROM settings WHERE key=?').get(k); return r?JSON.parse(r.value):def; },
  set:    (k, v)        => db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k,JSON.stringify(v)),
  getAll: ()            => { const rows=db.prepare('SELECT key,value FROM settings').all(); return Object.fromEntries(rows.map(r=>[r.key,JSON.parse(r.value)])); },
};

module.exports = { agentOps, taskOps, msgOps, settingsOps };
