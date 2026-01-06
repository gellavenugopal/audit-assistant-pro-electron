const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any IPC methods you need here
  platform: process.platform,

  // GSTZen API Methods (via IPC to main process - no CORS!)
  gstzen: {
    login: (credentials) => ipcRenderer.invoke('gstzen:login', credentials),
    getCustomerByEmail: (email, token) => ipcRenderer.invoke('gstzen:getCustomerByEmail', { email, token }),
    createCustomer: (customerData, token) => ipcRenderer.invoke('gstzen:createCustomer', { customerData, token }),
    getGstins: (customerUuid, token) => ipcRenderer.invoke('gstzen:getGstins', { customerUuid, token }),
    addGstin: (customerUuid, gstinData, token) => ipcRenderer.invoke('gstzen:addGstin', { customerUuid, gstinData, token }),
    updateGstinCredentials: (gstinUuid, credentials, token) => ipcRenderer.invoke('gstzen:updateGstinCredentials', { gstinUuid, credentials, token }),
    testGstinConnection: (gstinUuid, token) => ipcRenderer.invoke('gstzen:testGstinConnection', { gstinUuid, token }),
    downloadGstr1: (downloadRequest, token) => ipcRenderer.invoke('gstzen:downloadGstr1', { downloadRequest, token }),
  },
});

// Log when preload script is loaded
console.log('Preload script loaded with GSTZen IPC handlers');

