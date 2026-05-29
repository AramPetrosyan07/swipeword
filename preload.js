const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  storeLoad: () => ipcRenderer.invoke('store:load'),
  storeSave: (data) => ipcRenderer.invoke('store:save', data),
  storeLoadDictionary: () => ipcRenderer.invoke('store:loadDictionary'),
});
