const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('playerAPI', {
  pair: (serverUrl, pairingCode) => ipcRenderer.invoke('player:pair', { serverUrl, pairingCode }),
  getStatus: () => ipcRenderer.invoke('player:status'),
  start: () => ipcRenderer.invoke('player:start'),
  screenshot: () => ipcRenderer.invoke('player:screenshot'),
  fullscreen: () => ipcRenderer.invoke('player:fullscreen'),
  onLayoutUpdate: (callback) => ipcRenderer.on('layout:update', (event, layout) => callback(layout)),
  onScheduleUpdate: (callback) => ipcRenderer.on('schedule:update', () => callback()),
});
