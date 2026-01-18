const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// GSTZen API Configuration
const GSTZEN_API_URL = process.env.VITE_GSTZEN_API_URL || 'https://staging.gstzen.in';

// GSTZen API Helper Function
async function gstzenApiCall(endpoint, options = {}) {
    const url = `${GSTZEN_API_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    try {
        console.log('[GSTZen Main] Request:', options.method || 'GET', url);
        if (options.body) {
            console.log('[GSTZen Main] Payload:', options.body);
        }

        const response = await fetch(url, {
            ...options,
            headers,
        });

        const text = await response.text();
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch (e) {
            console.error('Failed to parse JSON response:', text.substring(0, 100));
            data = { error: 'Invalid JSON response', raw: text.substring(0, 1000) };
        }

        console.log(`[GSTZen Main] Response (${response.status}) ${url}:`, JSON.stringify(data, null, 2));

        return {
            ok: response.ok,
            status: response.status,
            data,
        };
    } catch (error) {
        console.error('[GSTZen Main] Error:', error);
        return {
            ok: false,
            status: 0,
            data: { error: error.message },
        };
    }
}

// IPC Handlers for GSTZen API
function setupGstzenHandlers() {
    // Login
    ipcMain.handle('gstzen:login', async (event, credentials) => {
        return await gstzenApiCall('/accounts/api/login/token/', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
    });

    // Customer operations
    ipcMain.handle('gstzen:getCustomerByEmail', async (event, { email, token }) => {
        return await gstzenApiCall(`/api/customer/by-email/${email}/`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` },
        });
    });

    ipcMain.handle('gstzen:createCustomer', async (event, { customerData, token }) => {
        return await gstzenApiCall('/api/customer/create/', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(customerData),
        });
    });

    // GSTIN operations
    ipcMain.handle('gstzen:getGstins', async (event, { customerUuid, token }) => {
        return await gstzenApiCall(`/api/customer/${customerUuid}/gstins/`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` },
        });
    });

    ipcMain.handle('gstzen:addGstin', async (event, { customerUuid, gstinData, token }) => {
        return await gstzenApiCall(`/api/customer/${customerUuid}/gstins/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(gstinData),
        });
    });

    ipcMain.handle('gstzen:updateGstinCredentials', async (event, { gstinUuid, credentials, token }) => {
        return await gstzenApiCall(`/api/gstin/${gstinUuid}/credentials/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(credentials),
        });
    });

    ipcMain.handle('gstzen:testGstinConnection', async (event, { gstinUuid, token }) => {
        return await gstzenApiCall(`/api/gstin/${gstinUuid}/test-connection/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
        });
    });

    // GSTN OTP Login
    ipcMain.handle('gstzen:generateOtp', async (event, { requestData, token }) => {
        return await gstzenApiCall('/api/gstn-generate-otp/', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(requestData),
        });
    });

    ipcMain.handle('gstzen:establishSession', async (event, { requestData, token }) => {
        return await gstzenApiCall('/api/gstn-establish-session/', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(requestData),
        });
    });

    // GSTR1 Downloads
    ipcMain.handle('gstzen:downloadGstr1', async (event, { downloadRequest, token }) => {
        return await gstzenApiCall('/api/gstr1/download/', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(downloadRequest),
        });
    });
}

function createWindow() {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        icon: path.join(__dirname, '../public/favicon.ico'),
        title: 'Audit Assistant Pro',
        show: false,
    });

    // Show window maximized when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.maximize();
        mainWindow.show();
    });

    // Load the app
    if (isDev) {
        // In development, load from Vite dev server
        mainWindow.loadURL('http://localhost:8080');
        // Open DevTools in development
        mainWindow.webContents.openDevTools();
    } else {
        // In production, load the built files
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
    setupGstzenHandlers();
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

