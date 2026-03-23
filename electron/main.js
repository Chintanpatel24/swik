const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path   = require('path');
const fs     = require('fs');
const { fork } = require('child_process');

// ── USB / Portable Mode Detection ────────────────────────────
// If .swik-portable exists next to the executable → USB mode
// All data stays on the USB drive
const exeDir     = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath);
const isPortable = fs.existsSync(path.join(exeDir, '.swik-portable')) ||
                   !!process.env.PORTABLE_EXECUTABLE_DIR;

const DATA_DIR = isPortable
  ? path.join(exeDir, 'swik-data')
  : path.join(app.getPath('userData'), 'swik-data');

fs.mkdirSync(DATA_DIR, { recursive: true });

process.env.SWIK_DATA_DIR   = DATA_DIR;
process.env.BACKEND_PORT    = '7843';
process.env.SWIK_IS_DESKTOP = '1';

const isDev      = !app.isPackaged;
const VITE_URL   = 'http://localhost:5175';

let mainWindow;
let backendProc;

// ── Backend process ───────────────────────────────────────────
function startBackend() {
  const entry = isDev
    ? path.join(__dirname, '..', 'backend', 'src', 'server.js')
    : path.join(process.resourcesPath, 'backend', 'src', 'server.js');

  backendProc = fork(entry, [], {
    env: {
      ...process.env,
      SWIK_DATA_DIR:   DATA_DIR,
      BACKEND_PORT:    '7843',
      FRONTEND_URL:    isDev ? VITE_URL : 'app://.',
      NODE_ENV:        isDev ? 'development' : 'production',
    },
    silent: false,
  });

  backendProc.on('error', e => console.error('[Backend]', e));
  backendProc.on('exit',  c => console.log('[Backend] exit', c));
}

// ── Window ────────────────────────────────────────────────────
async function createWindow() {
  mainWindow = new BrowserWindow({
    width:        1440,
    height:       900,
    minWidth:     1100,
    minHeight:    700,
    backgroundColor:'#0b0b14',
    titleBarStyle: 'hiddenInset',
    frame:         false,
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
    },
  });

  if (isDev) {
    await new Promise(r => setTimeout(r, 1800));
    mainWindow.loadURL(VITE_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── IPC ───────────────────────────────────────────────────────
ipcMain.handle('app:data-dir',    ()  => DATA_DIR);
ipcMain.handle('app:version',     ()  => app.getVersion());
ipcMain.handle('app:is-portable', ()  => isPortable);
ipcMain.handle('app:is-desktop',  ()  => true);
ipcMain.handle('window:minimize', ()  => mainWindow?.minimize());
ipcMain.handle('window:maximize', ()  => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize());
ipcMain.handle('window:close',    ()  => mainWindow?.close());

// ── Lifecycle ─────────────────────────────────────────────────
app.whenReady().then(() => {
  startBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  backendProc?.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
