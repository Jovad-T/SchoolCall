const { ipcRenderer } = require('electron');

try {
  window.electron = {
    send: (channel, data) => {
      ipcRenderer.send(channel, data);
    },
    invoke: (channel, data) => {
      return ipcRenderer.invoke(channel, data);
    }
  };
  window.ipcRenderer = ipcRenderer;
} catch (e) {
  console.error("Electron preload initialization error:", e);
}
