const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getDataDir:   () => ipcRenderer.invoke('app:data-dir'),
  getVersion:   () => ipcRenderer.invoke('app:version'),
  isPortable:   () => ipcRenderer.invoke('app:is-portable'),
  minimize:     () => ipcRenderer.invoke('window:minimize'),
  maximize:     () => ipcRenderer.invoke('window:maximize'),
  close:        () => ipcRenderer.invoke('window:close')
});
