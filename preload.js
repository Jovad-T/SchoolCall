const { ipcRenderer } = require('electron');

if (process.contextIsolated) {
  const { contextBridge } = require('electron');
  contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
      send: (channel, data) => ipcRenderer.send(channel, data),
      invoke: (channel, data) => ipcRenderer.invoke(channel, data),
      on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args))
    }
  });
} else {
  window.electron = {
    ipcRenderer: {
      send: (channel, data) => ipcRenderer.send(channel, data),
      invoke: (channel, data) => ipcRenderer.invoke(channel, data),
      on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args))
    }
  };
}
