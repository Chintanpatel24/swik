import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../data/techscan.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS summaries (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_number INTEGER NOT NULL,
    timestamp   TEXT    NOT NULL,
    raw_text    TEXT    NOT NULL,
    sources     TEXT    NOT NULL DEFAULT '[]',
    item_count  INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS raw_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id     INTEGER NOT NULL REFERENCES summaries(id) ON DELETE CASCADE,
    source      TEXT    NOT NULL,
    title       TEXT    NOT NULL,
    url         TEXT,
    meta        TEXT    NOT NULL DEFAULT '{}',
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS agent_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    level       TEXT    NOT NULL DEFAULT 'info',
    icon        TEXT    NOT NULL DEFAULT '·',
    message     TEXT    NOT NULL,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS agent_state (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS interests (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    topic      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    enabled    INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_summaries_created ON summaries(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_logs_created      ON agent_logs(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_raw_scan          ON raw_items(scan_id);
`);

// Seed default interests
const interestCount = db.prepare('SELECT COUNT(*) as c FROM interests').get().c;
if (interestCount === 0) {
  const defaults = [
    'AI / Machine Learning', 'Open Source', 'Web Development',
    'Rust', 'Go', 'Python', 'DevOps / Kubernetes', 'System Design',
    'Security', 'Developer Tools'
  ];
  const ins = db.prepare('INSERT OR IGNORE INTO interests (topic) VALUES (?)');
  db.transaction(() => defaults.forEach(t => ins.run(t)))();
}

// ── SUMMARIES ──
export const saveSummary = (scanNumber, timestamp, rawText, sources, itemCount) =>
  db.prepare(`INSERT INTO summaries (scan_number, timestamp, raw_text, sources, item_count)
              VALUES (?, ?, ?, ?, ?)`).run(scanNumber, timestamp, rawText, JSON.stringify(sources), itemCount).lastInsertRowid;

export const getSummaries = (limit = 50) =>
  db.prepare('SELECT * FROM summaries ORDER BY created_at DESC LIMIT ?').all(limit);

export const getSummaryCount = () =>
  db.prepare('SELECT COUNT(*) as count FROM summaries').get().count;

export const deleteSummary = (id) =>
  db.prepare('DELETE FROM summaries WHERE id = ?').run(id);

// ── RAW ITEMS ──
export const saveRawItems = (scanId, items) => {
  const stmt = db.prepare('INSERT INTO raw_items (scan_id, source, title, url, meta) VALUES (?, ?, ?, ?, ?)');
  db.transaction((items) => {
    for (const item of items) stmt.run(scanId, item.source, item.title, item.url || null, JSON.stringify(item));
  })(items);
};

export const getRawItems = (scanId) =>
  db.prepare('SELECT * FROM raw_items WHERE scan_id = ? ORDER BY id').all(scanId);

// ── LOGS ──
export const saveLog = (level, icon, message) =>
  db.prepare('INSERT INTO agent_logs (level, icon, message) VALUES (?, ?, ?)').run(level, icon, message);

export const getLogs = (limit = 200) =>
  db.prepare('SELECT * FROM agent_logs ORDER BY created_at DESC LIMIT ?').all(limit).reverse();

export const clearLogs = () =>
  db.prepare('DELETE FROM agent_logs').run();

// ── AGENT STATE ──
export const setState = (key, value) =>
  db.prepare(`INSERT INTO agent_state (key, value) VALUES (?, ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(key, JSON.stringify(value));

export const getState = (key, defaultVal = null) => {
  const row = db.prepare('SELECT value FROM agent_state WHERE key = ?').get(key);
  return row ? JSON.parse(row.value) : defaultVal;
};

// ── INTERESTS ──
export const getInterests = () =>
  db.prepare('SELECT * FROM interests ORDER BY topic ASC').all();

export const getEnabledInterests = () =>
  db.prepare('SELECT topic FROM interests WHERE enabled = 1 ORDER BY topic ASC').all().map(r => r.topic);

export const addInterest = (topic) => {
  try {
    return db.prepare('INSERT INTO interests (topic) VALUES (?)').run(topic.trim());
  } catch (e) {
    if (e.message.includes('UNIQUE')) throw new Error('Topic already exists');
    throw e;
  }
};

export const updateInterest = (id, enabled) =>
  db.prepare('UPDATE interests SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);

export const deleteInterest = (id) =>
  db.prepare('DELETE FROM interests WHERE id = ?').run(id);

// ── SETTINGS ──
export const getSetting = (key, defaultVal = null) => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? JSON.parse(row.value) : defaultVal;
};

export const setSetting = (key, value) =>
  db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(key, JSON.stringify(value));

export const getAllSettings = () => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  return Object.fromEntries(rows.map(r => [r.key, JSON.parse(r.value)]));
};

// ── STATS ──
export const getStats = () => {
  const totalScans      = db.prepare('SELECT COUNT(*) as c FROM summaries').get().c;
  const totalItems      = db.prepare('SELECT COALESCE(SUM(item_count),0) as c FROM summaries').get().c;
  const lastScan        = db.prepare('SELECT timestamp, scan_number FROM summaries ORDER BY created_at DESC LIMIT 1').get();
  const sourceBreakdown = db.prepare('SELECT source, COUNT(*) as count FROM raw_items GROUP BY source ORDER BY count DESC').all();
  const scanHistory     = db.prepare('SELECT scan_number, item_count, timestamp FROM summaries ORDER BY created_at DESC LIMIT 15').all();
  return { totalScans, totalItems, lastScan, sourceBreakdown, scanHistory };
};

export default db;
