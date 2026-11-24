const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  invoke: (c, ...a) => ipcRenderer.invoke(c, ...a),
  onState: cb => ipcRenderer.on('state', (_e, s) => cb(s))
});
