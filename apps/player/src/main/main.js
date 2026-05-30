const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const PlayerClient = require('./player-client');

let mainWindow;
let playerClient;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    fullscreen: false,
    frame: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  playerClient = new PlayerClient();

  // IPC: Pair player
  ipcMain.handle('player:pair', async (event, { serverUrl, pairingCode }) => {
    try {
      const result = await playerClient.pair(serverUrl, pairingCode);
      return { success: true, playerId: result.playerId };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // IPC: Get status
  ipcMain.handle('player:status', () => {
    return playerClient.getStatus();
  });

  // IPC: Start playback
  ipcMain.handle('player:start', () => {
    playerClient.start();
    return { success: true };
  });

  // IPC: Take screenshot
  ipcMain.handle('player:screenshot', async () => {
    if (mainWindow) {
      const image = await mainWindow.webContents.capturePage();
      return { success: true, data: image.toDataURL() };
    }
    return { success: false, error: 'No window' };
  });

  // IPC: Go fullscreen (kiosk mode)
  ipcMain.handle('player:fullscreen', () => {
    if (mainWindow) {
      mainWindow.setFullScreen(true);
    }
    return { success: true };
  });

  // Send layout update to renderer
  playerClient.onLayoutUpdate = (layout) => {
    if (mainWindow) {
      mainWindow.webContents.send('layout:update', layout);
    }
  };

  // Send full schedule update (layouts + overlays)
  playerClient.onScheduleUpdate = (scheduleData) => {
    if (mainWindow) {
      mainWindow.webContents.send('schedule:update', scheduleData || {});
    }
  };
});

app.on('window-all-closed', () => {
  if (playerClient) playerClient.stop();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
