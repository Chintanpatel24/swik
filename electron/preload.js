const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('swikElectron', {
  getDataDir:   () => ipcRenderer.invoke('app:data-dir'),
  getVersion:   () => ipcRenderer.invoke('app:version'),
  isPortable:   () => ipcRenderer.invoke('app:is-portable'),
  isDesktop:    () => ipcRenderer.invoke('app:is-desktop'),
  minimize:     () => ipcRenderer.invoke('window:minimize'),
  maximize:     () => ipcRenderer.invoke('window:maximize'),
  close:        () => ipcRenderer.invoke('window:close'),
});
