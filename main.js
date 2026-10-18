const { app, BrowserWindow, ipcMain, screen, desktopCapturer, Notification } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Set AppUserModelId for Windows Toast Notifications
app.setAppUserModelId('com.megumin.client');

let mainWindow = null;
let yamnetProcess = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        transparent: true,
        frame: false,
        resizable: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // Disables context isolation so preload.js isn't required
            webSecurity: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// ==========================================
// 🎵 YAMNet SOUND EVENT AI LISTENER
// ==========================================

function startAudioListener() {
    const scriptPath = path.join(__dirname, 'yamnet', 'yamnet_listener.py');
    const venvPython = path.join(__dirname, 'venv', 'Scripts', 'python.exe');
    const pythonExec = fs.existsSync(venvPython) ? venvPython : 'python';

    console.log(`🐍 [YAMNet AI Listener]: Using Python executable -> ${pythonExec}`);

    // Spawn Python YAMNet sidecar process (-u for unbuffered stdout)
    yamnetProcess = spawn(pythonExec, ['-u', scriptPath]);

    yamnetProcess.stdout.on('data', (data) => {
        const lines = data.toString().trim().split('\n');
        for (const line of lines) {
            const cleanLine = line.trim();
            if (cleanLine.startsWith('CHIME_DETECTED:')) {
                console.log(`🎵 [YAMNet Chime Event]: ${cleanLine}`);
                
                const parts = cleanLine.split(':');
                const chimeType = parts[1] || 'Chime';

                if (mainWindow && !mainWindow.isDestroyed()) {
                    // Send chime payload directly to renderer
                    mainWindow.webContents.send('on-audio-spike', { type: chimeType });
                    mainWindow.webContents.send('yamnet-chime-detected', { type: chimeType });
                }
            } else if (cleanLine) {
                console.log(`[YAMNet Log]: ${cleanLine}`);
            }
        }
    });

    yamnetProcess.stderr.on('data', (data) => {
        console.warn('[YAMNet Stderr]:', data.toString());
    });

    yamnetProcess.on('exit', (code) => {
        console.log(`[YAMNet Process Exited]: Code ${code}`);
    });
}

// ==========================================
// 🔌 IPC LISTENERS (Window Controls & Modes)
// ==========================================

ipcMain.on('minimize-to-chibi', () => {
    if (!mainWindow) return;
    mainWindow.setSize(240, 300);
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setResizable(false);
});

ipcMain.on('enter-companion-mode', () => {
    if (!mainWindow) return;
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    mainWindow.setBounds({ x: 0, y: 0, width: width, height: height });
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
});

ipcMain.on('set-ignore-mouse', (_, ignore) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
    }
});

ipcMain.on('restore-main-window', () => {
    if (!mainWindow) return;
    mainWindow.setIgnoreMouseEvents(false);
    mainWindow.setSize(1280, 720);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setResizable(true);
    mainWindow.center();
});

ipcMain.on('window-minimize', () => mainWindow && mainWindow.minimize());
ipcMain.on('window-maximize', () => {
    if (!mainWindow) return;
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow && mainWindow.close());

// ==========================================
// ⚙️ SYSTEM CONTEXT & NOTIFICATIONS
// ==========================================

ipcMain.handle('get-system-context', async () => {
    try {
        const now = new Date();
        return {
            currentTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            currentDate: now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            activeApp: 'Desktop',
            activePageOrTitle: 'Desktop Workspace',
            openAppsCount: 1,
            openAppsSummary: 'Megumin Client',
            latestNotification: 'YAMNet AI audio notification listener active.'
        };
    } catch (err) {
        console.error("System context error:", err);
        return null;
    }
});

// Windows Toast Notification Dispatcher (for outgoing alerts)
ipcMain.handle('send-notification', (_, { title, body }) => {
    if (Notification.isSupported()) {
        const notification = new Notification({
            title: title || 'Megumin',
            body: body || 'Shiro, you have a notification!'
        });
        notification.show();
        return true;
    }
    return false;
});

// General Screen Capture Handler
ipcMain.handle('capture-screen', async () => {
    try {
        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: 1920, height: 1080 }
        });

        if (sources.length > 0) {
            return sources[0].thumbnail.toJPEG(80).toString('base64');
        }
        return null;
    } catch (err) {
        console.error("Screen Capture Error:", err);
        return null;
    }
});

// ==========================================
// 🚀 APP LIFECYCLE
// ==========================================

app.whenReady().then(() => {
    createWindow();
    startAudioListener();
});

app.on('will-quit', () => {
    if (yamnetProcess) {
        yamnetProcess.kill();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});