const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path   = require('path');
const fs     = require('fs');
const { fork } = require('child_process');

// ── USB PORTABLE MODE ──────────────────────────────────────────────────────
// If we're running from a removable drive, store all data next to the exe.
// Otherwise use standard app data dir.
const isPortable = process.env.PORTABLE_EXECUTABLE_DIR ||
                   fs.existsSync(path.join(path.dirname(process.execPath), '.agentoffice-portable'));

const DATA_DIR = isPortable
  ? path.join(process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath), 'agentoffice-data')
  : path.join(app.getPath('userData'), 'agentoffice-data');

fs.mkdirSync(DATA_DIR, { recursive: true });
process.env.AGENT_DATA_DIR = DATA_DIR;
process.env.BACKEND_PORT   = '7842';

const isDev = !app.isPackaged;
const VITE_URL    = 'http://localhost:5174';
const BACKEND_URL = `http://localhost:${process.env.BACKEND_PORT}`;

let mainWindow;
let backendProcess;

// ── START BACKEND ──────────────────────────────────────────────────────────
function startBackend() {
  const backendEntry = isDev
    ? path.join(__dirname, '..', 'backend', 'src', 'server.js')
    : path.join(process.resourcesPath, 'backend', 'src', 'server.js');

  backendProcess = fork(backendEntry, [], {
    env: {
      ...process.env,
      AGENT_DATA_DIR: DATA_DIR,
      BACKEND_PORT:   '7842',
      NODE_ENV:       isDev ? 'development' : 'production'
    },
    silent: false
  });

  backendProcess.on('error', (err) => console.error('[Backend]', err));
  backendProcess.on('exit',  (code) => console.log('[Backend] exited', code));
}

// ── CREATE WINDOW ──────────────────────────────────────────────────────────
async function createWindow() {
  mainWindow = new BrowserWindow({
    width:           1400,
    height:          900,
    minWidth:        1000,
    minHeight:       700,
    backgroundColor: '#0d0d14',
    titleBarStyle:   'hiddenInset',
    frame:           false,
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false
    },
    icon: path.join(__dirname, 'icon.png')
  });

  // In dev load Vite; in prod load built dist
  if (isDev) {
    // Wait a moment for backend to start
    await new Promise(r => setTimeout(r, 1500));
    mainWindow.loadURL(VITE_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });

  // Open external links in OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ── IPC ────────────────────────────────────────────────────────────────────
ipcMain.handle('app:data-dir',  () => DATA_DIR);
ipcMain.handle('app:version',   () => app.getVersion());
ipcMain.handle('app:is-portable', () => !!isPortable);
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.handle('window:close', () => mainWindow?.close());

// ── APP LIFECYCLE ──────────────────────────────────────────────────────────
app.whenReady().then(() => {
  startBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
