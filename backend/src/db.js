// backend/src/db.js
const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const DATA_DIR = process.env.AGENT_DATA_DIR || path.join(__dirname, '../../data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'agentoffice.db');
const db      = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'worker',
    avatar      TEXT NOT NULL DEFAULT 'dev',
    color       TEXT NOT NULL DEFAULT '#4f8ef7',
    model       TEXT NOT NULL DEFAULT 'llama3.2',
    api_type    TEXT NOT NULL DEFAULT 'ollama',
    api_url     TEXT NOT NULL DEFAULT 'http://localhost:11434',
    api_key     TEXT,
    system_prompt TEXT NOT NULL DEFAULT '',
    skills      TEXT NOT NULL DEFAULT '[]',
    desk_x      REAL NOT NULL DEFAULT 200,
    desk_y      REAL NOT NULL DEFAULT 200,
    enabled     INTEGER NOT NULL DEFAULT 1,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending',
    assigned_to TEXT,
    created_by  TEXT,
    result      TEXT,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS messages (
    id          TEXT PRIMARY KEY,
    task_id     TEXT,
    from_agent  TEXT NOT NULL,
    to_agent    TEXT,
    content     TEXT NOT NULL,
    type        TEXT NOT NULL DEFAULT 'chat',
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS workspaces (
    id          TEXT PRIMARY KEY,
    agent_id    TEXT NOT NULL,
    task_id     TEXT,
    file_path   TEXT NOT NULL,
    content     TEXT NOT NULL DEFAULT '',
    created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_messages_task   ON messages(task_id);
  CREATE INDEX IF NOT EXISTS idx_messages_time   ON messages(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_tasks_status    ON tasks(status);
`);

// ── SEED DEFAULT AGENTS ────────────────────────────────────────────────────
const count = db.prepare('SELECT COUNT(*) as c FROM agents').get().c;
if (count === 0) {
  const insert = db.prepare(`
    INSERT INTO agents (id, name, role, avatar, color, model, system_prompt, skills, desk_x, desk_y)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  db.transaction(() => {
    insert.run('boss-1',    'Rex',    'boss',       'boss',    '#f7c94f', 'llama3.2',
      'You are Rex, the Boss agent. You break down tasks, delegate to the right agents, and synthesise results. Be decisive and clear.',
      JSON.stringify(['planning', 'delegation', 'review', 'decision-making']), 500, 300);

    insert.run('dev-1',     'Nova',   'developer',  'dev',     '#4f8ef7', 'llama3.2',
      'You are Nova, a Senior Developer. You write clean, working code. You solve technical problems. You document your solutions.',
      JSON.stringify(['Python', 'JavaScript', 'Node.js', 'React', 'debugging', 'architecture']), 200, 200);

    insert.run('design-1',  'Pixel',  'designer',   'design',  '#f74faa', 'llama3.2',
      'You are Pixel, a UI/UX Designer. You create beautiful, user-friendly designs. You think about aesthetics and user experience.',
      JSON.stringify(['UI design', 'UX', 'CSS', 'color theory', 'typography', 'wireframing']), 800, 200);

    insert.run('search-1',  'Scout',  'researcher', 'search',  '#4ff7c4', 'llama3.2',
      'You are Scout, a Research Agent. You search the web, gather information, summarise findings, and report facts accurately.',
      JSON.stringify(['web search', 'research', 'summarisation', 'fact-checking', 'data gathering']), 200, 450);

    insert.run('writer-1',  'Quill',  'writer',     'writer',  '#c44ff7', 'llama3.2',
      'You are Quill, a Technical Writer. You write documentation, README files, blog posts, and clear explanations.',
      JSON.stringify(['documentation', 'markdown', 'copywriting', 'README', 'technical writing']), 800, 450);
  })();
}

// ── AGENTS ─────────────────────────────────────────────────────────────────
const agentOps = {
  getAll:    ()      => db.prepare('SELECT * FROM agents ORDER BY role, name').all(),
  getById:   (id)    => db.prepare('SELECT * FROM agents WHERE id = ?').get(id),
  create:    (a)     => db.prepare(`INSERT INTO agents (id,name,role,avatar,color,model,api_type,api_url,api_key,system_prompt,skills,desk_x,desk_y) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(a.id,a.name,a.role,a.avatar,a.color,a.model,a.api_type,a.api_url,a.api_key||null,a.system_prompt,JSON.stringify(a.skills||[]),a.desk_x||300,a.desk_y||300),
  update:    (id, a) => db.prepare(`UPDATE agents SET name=?,role=?,avatar=?,color=?,model=?,api_type=?,api_url=?,api_key=?,system_prompt=?,skills=?,desk_x=?,desk_y=?,enabled=? WHERE id=?`).run(a.name,a.role,a.avatar,a.color,a.model,a.api_type,a.api_url,a.api_key||null,a.system_prompt,JSON.stringify(a.skills||[]),a.desk_x,a.desk_y,a.enabled?1:0,id),
  delete:    (id)    => db.prepare('DELETE FROM agents WHERE id = ?').run(id),
  updatePos: (id, x, y) => db.prepare('UPDATE agents SET desk_x=?,desk_y=? WHERE id=?').run(x, y, id)
};

// ── TASKS ──────────────────────────────────────────────────────────────────
const taskOps = {
  getAll:   ()      => db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all(),
  getById:  (id)    => db.prepare('SELECT * FROM tasks WHERE id = ?').get(id),
  create:   (t)     => db.prepare(`INSERT INTO tasks (id,title,description,status,created_by) VALUES (?,?,?,?,?)`).run(t.id,t.title,t.description,'pending',t.created_by||'user'),
  update:   (id, t) => db.prepare(`UPDATE tasks SET status=?,assigned_to=?,result=?,updated_at=unixepoch() WHERE id=?`).run(t.status,t.assigned_to||null,t.result||null,id),
  delete:   (id)    => db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
};

// ── MESSAGES ────────────────────────────────────────────────────────────────
const msgOps = {
  getByTask:  (taskId) => db.prepare('SELECT * FROM messages WHERE task_id = ? ORDER BY created_at ASC').all(taskId),
  getRecent:  (limit)  => db.prepare('SELECT * FROM messages ORDER BY created_at DESC LIMIT ?').all(limit||50).reverse(),
  create:     (m)      => db.prepare(`INSERT INTO messages (id,task_id,from_agent,to_agent,content,type) VALUES (?,?,?,?,?,?)`).run(m.id,m.task_id||null,m.from_agent,m.to_agent||null,m.content,m.type||'chat')
};

// ── WORKSPACE ───────────────────────────────────────────────────────────────
const workspaceOps = {
  getByAgent: (agentId) => db.prepare('SELECT * FROM workspaces WHERE agent_id = ? ORDER BY updated_at DESC').all(agentId),
  save:       (w)       => db.prepare(`INSERT OR REPLACE INTO workspaces (id,agent_id,task_id,file_path,content,updated_at) VALUES (?,?,?,?,?,unixepoch())`).run(w.id,w.agent_id,w.task_id||null,w.file_path,w.content)
};

module.exports = { agentOps, taskOps, msgOps, workspaceOps };
