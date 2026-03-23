const path = require('path');
const fs   = require('fs');
const config = require('../config');

const WS_ROOT = path.join(config.dataDir, 'workspaces');
fs.mkdirSync(WS_ROOT, { recursive: true });

function safePath(agentId, taskId, filePath) {
  const base = path.join(WS_ROOT, agentId, taskId || 'general');
  fs.mkdirSync(base, { recursive: true });
  const safe = path.join(base, path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, ''));
  if (!safe.startsWith(base)) throw new Error('Path traversal blocked');
  return safe;
}

const fsTool = {
  list(agentId, taskId='general', subDir='') {
    const base = path.join(WS_ROOT, agentId, taskId, subDir);
    if (!fs.existsSync(base)) return { ok: true, files: [] };
    return {
      ok: true,
      files: fs.readdirSync(base, { withFileTypes: true }).map(e => ({
        name:  e.name,
        isDir: e.isDirectory(),
        path:  path.join(subDir, e.name),
      })),
    };
  },
  read(agentId, taskId, filePath) {
    try {
      return { ok: true, content: fs.readFileSync(safePath(agentId, taskId, filePath), 'utf-8'), path: filePath };
    } catch(e) { return { ok: false, error: e.message }; }
  },
  write(agentId, taskId, filePath, content) {
    try {
      const full = safePath(agentId, taskId, filePath);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content, 'utf-8');
      return { ok: true, path: filePath, bytes: Buffer.byteLength(content) };
    } catch(e) { return { ok: false, error: e.message }; }
  },
  workspacePath(agentId, taskId='general') {
    const p = path.join(WS_ROOT, agentId, taskId);
    fs.mkdirSync(p, { recursive: true });
    return p;
  },
};

module.exports = { fsTool };
