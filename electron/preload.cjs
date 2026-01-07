const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any IPC methods you need here
  platform: process.platform,
  gstzen: {
    login: (credentials) => ipcRenderer.invoke('gstzen-login', credentials),
    testGstinConnection: (gstinUuid, token) => ipcRenderer.invoke('gstzen-test-connection', { gstinUuid, token }),
    generateOtp: (data, token) => ipcRenderer.invoke('gstzen-generate-otp', { data, token }),
    establishSession: (data, token) => ipcRenderer.invoke('gstzen-establish-session', { data, token }),
    downloadGstr1: (data, token) => ipcRenderer.invoke('gstzen-download-gstr1', { data, token }),
  },
  // Example: send a message to main process
  send: (channel, data) => {
    const validChannels = ['toMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  // Example: receive a message from main process
  receive: (channel, func) => {
    const validChannels = ['fromMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
});

// Log when preload script is loaded
console.log('Preload script loaded');

