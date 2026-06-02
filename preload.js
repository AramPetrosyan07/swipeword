const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  storeLoad: () => ipcRenderer.invoke('store:load'),
  storeSave: (data) => ipcRenderer.invoke('store:save', data),
  storeLoadDictionary: () => ipcRenderer.invoke('store:loadDictionary'),
  storeLoadTags: () => ipcRenderer.invoke('store:loadTags'),
  loadFavoritesFile: () => ipcRenderer.invoke('store:loadFavoritesFile'),
  collectionLoad: () => ipcRenderer.invoke('collection:load'),
  collectionAdd: (word) => ipcRenderer.invoke('collection:add', word),
  collectionRemove: (word) => ipcRenderer.invoke('collection:remove', word),
});
