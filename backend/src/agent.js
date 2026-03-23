import cron from 'node-cron';
import { fetchHackerNews } from './sources/hackernews.js';
import { fetchGitHub }     from './sources/github.js';
import { fetchDevTo }      from './sources/devto.js';
import { fetchReddit }     from './sources/reddit.js';
import { generateSummary, checkOllamaReady } from './ai.js';
import { config } from './config.js';
import {
  saveSummary, saveRawItems, saveLog,
  getSummaryCount, setState, getState, getEnabledInterests
} from './db.js';

let broadcast = () => {};
export const setBroadcast = (fn) => { broadcast = fn; };

let cronJob = null;

// ── LOGGING ──
function log(message, level = 'info', icon = '·') {
  const entry = { id: Date.now(), level, icon, message, timestamp: new Date().toISOString() };
  saveLog(level, icon, message);
  broadcast({ type: 'log', data: entry });
  console.log(`[${level.toUpperCase()}] ${icon} ${message}`);
  return entry;
}

// ── STATUS ──
export function getAgentStatus() {
  return {
    isScanning:   getState('isScanning', false),
    lastScanAt:   getState('lastScanAt', null),
    nextScanAt:   getState('nextScanAt', null),
    scanCount:    getSummaryCount(),
    uptime:       process.uptime(),
    model:        config.ollama.model,
    scanInterval: config.agent.scanIntervalMinutes
  };
}

// ── MAIN SCAN ──
export async function runScan() {
  if (getState('isScanning', false)) {
    log('Scan already in progress — skipping', 'warn', '⚠');
    return;
  }

  setState('isScanning', true);
  const scanNumber = getSummaryCount() + 1;
  const startedAt  = new Date();

  broadcast({ type: 'scan_start', data: { scanNumber, startedAt: startedAt.toISOString() } });

  log('═══════════════════════════════════════', 'info', '');
  log(`SCAN #${scanNumber} INITIATED`, 'ok', '▶');
  log(`Timestamp: ${startedAt.toLocaleString('en-IN', { timeZone: config.agent.timezone })}`, 'info', '·');

  // Load user interests for personalised prompting
  const interests = getEnabledInterests();
  if (interests.length > 0) {
    log(`Personalising for ${interests.length} topics: ${interests.slice(0,3).join(', ')}${interests.length > 3 ? '...' : ''}`, 'ai', '⬡');
  }

  broadcast({ type: 'progress', data: { pct: 5 } });

  let hn = [], github = [], devto = [], reddit = [];

  log('Connecting to Hacker News...', 'fetch', '↓');
  try { hn = await fetchHackerNews(); log(`✓ HackerNews: ${hn.length} stories`, 'ok', '✓'); }
  catch (e) { log(`✗ HackerNews: ${e.message}`, 'err', '✗'); }
  broadcast({ type: 'progress', data: { pct: 25 } });

  log('Querying GitHub Trending...', 'fetch', '↓');
  try { github = await fetchGitHub(); log(`✓ GitHub: ${github.length} repos`, 'ok', '✓'); }
  catch (e) { log(`✗ GitHub: ${e.message}`, 'err', '✗'); }
  broadcast({ type: 'progress', data: { pct: 45 } });

  log('Scanning Dev.to articles...', 'fetch', '↓');
  try { devto = await fetchDevTo(); log(`✓ Dev.to: ${devto.length} articles`, 'ok', '✓'); }
  catch (e) { log(`✗ Dev.to: ${e.message}`, 'err', '✗'); }
  broadcast({ type: 'progress', data: { pct: 62 } });

  log('Fetching Reddit hot posts...', 'fetch', '↓');
  try { reddit = await fetchReddit(); log(`✓ Reddit: ${reddit.length} posts`, 'ok', '✓'); }
  catch (e) { log(`✗ Reddit: ${e.message}`, 'err', '✗'); }
  broadcast({ type: 'progress', data: { pct: 75 } });

  const allItems = [...hn, ...github, ...devto, ...reddit];
  log(`Total: ${allItems.length} items collected`, 'ok', '✓');

  if (allItems.length === 0) {
    log('No data fetched — aborting scan', 'err', '✗');
    setState('isScanning', false);
    broadcast({ type: 'scan_error', data: { message: 'No data fetched' } });
    broadcast({ type: 'progress', data: { pct: 0 } });
    return;
  }

  // AI analysis
  log(`Sending ${allItems.length} items to Ollama (${config.ollama.model})...`, 'ai', '⬡');

  try {
    const summaryText = await generateSummary(hn, github, devto, reddit, interests);
    broadcast({ type: 'progress', data: { pct: 92 } });

    log('AI analysis complete ✓', 'ok', '✓');

    const sources   = [hn.length && 'HackerNews', github.length && 'GitHub', devto.length && 'Dev.to', reddit.length && 'Reddit'].filter(Boolean);
    const timestamp = startedAt.toLocaleString('en-IN', { timeZone: config.agent.timezone, dateStyle: 'medium', timeStyle: 'medium' });

    const scanId = saveSummary(scanNumber, timestamp, summaryText, sources, allItems.length);
    saveRawItems(scanId, allItems);

    broadcast({
      type: 'new_summary',
      data: { id: scanId, scan_number: scanNumber, timestamp, raw_text: summaryText, sources: JSON.stringify(sources), item_count: allItems.length }
    });
    broadcast({ type: 'progress', data: { pct: 100 } });

    setState('lastScanAt', startedAt.toISOString());
    log(`SCAN #${scanNumber} COMPLETE in ${((Date.now() - startedAt.getTime()) / 1000).toFixed(1)}s`, 'ok', '▶');

  } catch (e) {
    log(`AI analysis failed: ${e.message}`, 'err', '✗');
    broadcast({ type: 'scan_error', data: { message: e.message } });
    broadcast({ type: 'progress', data: { pct: 0 } });
  }

  log('Agent returning to standby...', 'info', '·');
  setState('isScanning', false);

  const nextAt = new Date(Date.now() + config.agent.scanIntervalMinutes * 60 * 1000);
  setState('nextScanAt', nextAt.toISOString());
  broadcast({ type: 'status_update', data: getAgentStatus() });
  setTimeout(() => broadcast({ type: 'progress', data: { pct: 0 } }), 2000);
}

// ── SCHEDULER ──
export async function startScheduler() {
  log('TechScan Agent booting...', 'ok', '▶');
  log(`Sources: HackerNews | GitHub | Dev.to | Reddit`, 'info', '·');
  log(`AI engine: Ollama (${config.ollama.model}) — 100% local & free`, 'ai', '⬡');
  log(`Scan interval: every ${config.agent.scanIntervalMinutes} minutes`, 'info', '·');

  log('Checking Ollama connection...', 'ai', '⬡');
  const { ok, error, models } = await checkOllamaReady();
  if (!ok) {
    log(`Ollama not ready: ${error}`, 'err', '✗');
    log('Fix Ollama, then trigger a manual scan.', 'warn', '⚠');
  } else {
    log(`Ollama OK — models: ${models.join(', ')}`, 'ok', '✓');
  }

  const cronExpr = `*/${config.agent.scanIntervalMinutes} * * * *`;
  cronJob = cron.schedule(cronExpr, () => {
    log('Scheduled scan triggered by cron', 'info', '·');
    runScan();
  });

  // Initial scan after short boot delay
  setTimeout(() => {
    log('Running initial scan on startup...', 'info', '·');
    runScan();
  }, 2000);
}

// Reschedule when interval changes (called from settings API)
export function reschedule(newIntervalMinutes) {
  if (cronJob) { cronJob.stop(); cronJob = null; }
  config.agent.scanIntervalMinutes = newIntervalMinutes;
  const cronExpr = `*/${newIntervalMinutes} * * * *`;
  cronJob = cron.schedule(cronExpr, () => {
    log(`Rescheduled scan triggered (every ${newIntervalMinutes}min)`, 'info', '·');
    runScan();
  });
  log(`Scan interval updated to ${newIntervalMinutes} minutes`, 'ok', '✓');
}
