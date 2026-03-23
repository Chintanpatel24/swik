const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const DATA_DIR = process.env.AGENT_DATA_DIR || path.join(__dirname, '../../data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'agentoffice.db');
const db      = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'developer',
    avatar        TEXT NOT NULL DEFAULT 'default',
    color         TEXT NOT NULL DEFAULT '#4f8ef7',
    model         TEXT NOT NULL DEFAULT 'llama3.2',
    api_type      TEXT NOT NULL DEFAULT 'ollama',
    api_url       TEXT NOT NULL DEFAULT 'http://localhost:11434',
    api_key       TEXT,
    system_prompt TEXT NOT NULL DEFAULT '',
    skills        TEXT NOT NULL DEFAULT '[]',
    desk_x        REAL NOT NULL DEFAULT 300,
    desk_y        REAL NOT NULL DEFAULT 300,
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

  CREATE INDEX IF NOT EXISTS idx_messages_task ON messages(task_id);
  CREATE INDEX IF NOT EXISTS idx_messages_time ON messages(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_tasks_status  ON tasks(status);
`);

// Helper: always normalise skills to a JSON string
function normaliseSkills(skills) {
  if (!skills) return '[]';
  if (Array.isArray(skills)) return JSON.stringify(skills);
  if (typeof skills === 'string') {
    try { JSON.parse(skills); return skills; } catch { return JSON.stringify([]); }
  }
  return '[]';
}

// ── SEED default agents on first run ──────────────────────────
const agentCount = db.prepare('SELECT COUNT(*) as c FROM agents').get().c;
if (agentCount === 0) {
  const ins = db.prepare(`INSERT INTO agents (id,name,role,avatar,color,model,api_type,api_url,system_prompt,skills,desk_x,desk_y) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  db.transaction(() => {
    ins.run('agent-boss',   'Rex',   'boss',       'boss',    '#f7c94f', 'llama3.2', 'ollama', 'http://localhost:11434',
      'You are Rex, the Boss agent. You break down tasks, delegate to the right team members, and synthesise final results. Be concise and decisive.',
      JSON.stringify(['planning','delegation','synthesis','project management']), 500, 220);

    ins.run('agent-dev',    'Nova',  'developer',  'dev',     '#4f8ef7', 'llama3.2', 'ollama', 'http://localhost:11434',
      'You are Nova, a senior developer. You write clean, working code with clear comments. You think before you code and always test your logic.',
      JSON.stringify(['Python','JavaScript','Node.js','React','debugging','architecture']), 200, 180);

    ins.run('agent-design', 'Pixel', 'designer',   'designer','#f74faa', 'llama3.2', 'ollama', 'http://localhost:11434',
      'You are Pixel, a UI/UX designer. You create beautiful, user-friendly designs. You produce detailed specs, CSS, and design rationale.',
      JSON.stringify(['UI design','UX','CSS','Tailwind','color theory','typography','Figma']), 800, 180);

    ins.run('agent-search', 'Scout', 'researcher', 'search',  '#4ff7c4', 'llama3.2', 'ollama', 'http://localhost:11434',
      'You are Scout, a research agent. You search the web, gather accurate information, cross-reference sources, and summarise findings clearly.',
      JSON.stringify(['web search','research','summarisation','fact-checking','data gathering']), 200, 400);

    ins.run('agent-writer', 'Quill', 'writer',     'writer',  '#c44ff7', 'llama3.2', 'ollama', 'http://localhost:11434',
      'You are Quill, a technical writer. You write clear documentation, README files, blog posts, and user guides.',
      JSON.stringify(['documentation','markdown','copywriting','README','technical writing','blog posts']), 800, 400);
  })();
  console.log('[DB] Seeded 5 default agents');
}

// ── AGENTS ────────────────────────────────────────────────────
const agentOps = {
  getAll: () => db.prepare('SELECT * FROM agents WHERE enabled=1 ORDER BY created_at ASC').all(),

  getById: (id) => db.prepare('SELECT * FROM agents WHERE id=?').get(id),

  create: (a) => db.prepare(`
    INSERT INTO agents (id,name,role,avatar,color,model,api_type,api_url,api_key,system_prompt,skills,desk_x,desk_y,enabled)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(a.id, a.name, a.role||'developer', a.avatar||'default', a.color||'#4f8ef7',
         a.model||'llama3.2', a.api_type||'ollama', a.api_url||'http://localhost:11434',
         a.api_key||null, a.system_prompt||'', normaliseSkills(a.skills),
         a.desk_x||300, a.desk_y||300, a.enabled??1),

  update: (id, a) => db.prepare(`
    UPDATE agents SET name=?,role=?,avatar=?,color=?,model=?,api_type=?,api_url=?,api_key=?,
    system_prompt=?,skills=?,desk_x=?,desk_y=?,enabled=? WHERE id=?
  `).run(a.name, a.role, a.avatar||'default', a.color, a.model, a.api_type,
         a.api_url, a.api_key||null, a.system_prompt, normaliseSkills(a.skills),
         a.desk_x||300, a.desk_y||300, a.enabled??1, id),

  delete:    (id)      => db.prepare('DELETE FROM agents WHERE id=?').run(id),
  updatePos: (id,x,y)  => db.prepare('UPDATE agents SET desk_x=?,desk_y=? WHERE id=?').run(x,y,id),
};

// ── TASKS ─────────────────────────────────────────────────────
const taskOps = {
  getAll:  ()   => db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all(),
  getById: (id) => db.prepare('SELECT * FROM tasks WHERE id=?').get(id),

  create: (t) => db.prepare(`
    INSERT INTO tasks (id,title,description,status,created_by) VALUES (?,?,?,?,?)
  `).run(t.id, t.title, t.description||'', 'pending', t.created_by||'user'),

  update: (id, t) => db.prepare(`
    UPDATE tasks SET status=?,assigned_to=?,result=?,updated_at=unixepoch() WHERE id=?
  `).run(t.status, t.assigned_to||null, t.result||null, id),

  delete: (id) => db.prepare('DELETE FROM tasks WHERE id=?').run(id),
};

// ── MESSAGES ──────────────────────────────────────────────────
const msgOps = {
  getByTask: (taskId) =>
    db.prepare('SELECT * FROM messages WHERE task_id=? ORDER BY created_at ASC').all(taskId),

  getRecent: (limit=100) =>
    db.prepare('SELECT * FROM messages ORDER BY created_at DESC LIMIT ?').all(limit).reverse(),

  create: (m) => db.prepare(`
    INSERT INTO messages (id,task_id,from_agent,to_agent,content,type) VALUES (?,?,?,?,?,?)
  `).run(m.id, m.task_id||null, m.from_agent, m.to_agent||null, m.content, m.type||'chat'),
};

module.exports = { agentOps, taskOps, msgOps };
