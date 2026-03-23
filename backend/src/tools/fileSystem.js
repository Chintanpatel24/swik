// tools/fileSystem.js — Isolated per-agent/per-task workspace
const path = require('path');
const fs   = require('fs');

const DATA_DIR = process.env.AGENT_DATA_DIR || path.join(__dirname, '../../../data');
const WS_ROOT  = path.join(DATA_DIR, 'workspaces');
fs.mkdirSync(WS_ROOT, { recursive: true });

// Resolve a path INSIDE the agent's workspace — never lets paths escape the sandbox
function safePath(agentId, taskId, filePath) {
  const base = path.join(WS_ROOT, agentId, taskId || 'general');
  fs.mkdirSync(base, { recursive: true });
  // Strip any attempt to escape
  const safe = path.join(base, path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, ''));
  if (!safe.startsWith(base)) throw new Error('Path traversal attempt blocked');
  return safe;
}

const fsTool = {
  // List files in agent workspace
  list(agentId, taskId = 'general', subDir = '') {
    const base = path.join(WS_ROOT, agentId, taskId, subDir);
    if (!fs.existsSync(base)) return { ok: true, files: [] };
    const entries = fs.readdirSync(base, { withFileTypes: true });
    return {
      ok: true,
      files: entries.map(e => ({
        name:  e.name,
        isDir: e.isDirectory(),
        path:  path.join(subDir, e.name)
      }))
    };
  },

  // Read a file
  read(agentId, taskId, filePath) {
    try {
      const full = safePath(agentId, taskId, filePath);
      const content = fs.readFileSync(full, 'utf-8');
      return { ok: true, content, path: filePath };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  // Write a file
  write(agentId, taskId, filePath, content) {
    try {
      const full = safePath(agentId, taskId, filePath);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content, 'utf-8');
      return { ok: true, path: filePath, bytes: Buffer.byteLength(content) };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  // Delete a file
  delete(agentId, taskId, filePath) {
    try {
      const full = safePath(agentId, taskId, filePath);
      fs.unlinkSync(full);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  // Get workspace root path (for display)
  getWorkspacePath(agentId, taskId = 'general') {
    const p = path.join(WS_ROOT, agentId, taskId);
    fs.mkdirSync(p, { recursive: true });
    return p;
  }
};

module.exports = { fsTool };
