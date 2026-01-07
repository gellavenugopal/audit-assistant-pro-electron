const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
    title: 'Audit Assistant Pro',
    show: false,
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the app
  if (isDev) {
    // In development, load from Vite dev server
    mainWindow.loadURL('http://localhost:8080');
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers for GSTZen API
// Use localhost for development/testing as per user logs. 
// For production, this should be 'https://app.gstzen.in'
const API_BASE_URL = 'http://localhost:9001';

async function handleApiRequest(endpoint, method, data, token) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    // Handle empty response (e.g. 204 No Content)
    // Handle empty response (e.g. 204 No Content)
    const text = await response.text();
    let json = {};
    try {
      if (text && text.trim()) {
        json = JSON.parse(text);
      }
    } catch (e) {
      console.error(`[API] Invalid JSON from ${endpoint}:`, text.substring(0, 500));
      // Fallback: If not JSON, but has text, maybe return it as message?
      // If HTML, prevent bloat.
      if (response.ok) {
        // If 200 OK but invalid JSON, it's a backend issue.
        return { ok: false, status: 500, data: { message: "Invalid response from server" } };
      }
    }

    return { ok: response.ok, status: response.status, data: json };
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    return { ok: false, data: { message: error.message || 'Network request failed' } };
  }
}

ipcMain.handle('gstzen-login', async (event, credentials) => {
  return handleApiRequest('/accounts/api/login/token/', 'POST', credentials);
});

ipcMain.handle('gstzen-test-connection', async (event, { gstinUuid, token }) => {
  return handleApiRequest(`/api/gstin/${gstinUuid}/test-connection/`, 'POST', {}, token);
});

ipcMain.handle('gstzen-generate-otp', async (event, { data, token }) => {
  return handleApiRequest('/api/gstn-generate-otp/', 'POST', data, token);
});

ipcMain.handle('gstzen-establish-session', async (event, { data, token }) => {
  return handleApiRequest('/api/gstn-establish-session/', 'POST', data, token);
});

ipcMain.handle('gstzen-download-gstr1', async (event, { data, token }) => {
  return handleApiRequest('/api/gstr1/download/', 'POST', {
    api_name: data.api_name,
    gstin: data.gstin,
    ret_period: data.filing_period || data.ret_period, // Handle potential field name diffs
  }, token);
});

