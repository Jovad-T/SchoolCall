const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

let mainWindow;
let tray = null;
let hideTimeout = null;
let scheduledShowTimeout = null;

const classSchedule = [
  { start: "08:30", end: "09:20" },
  { start: "09:30", end: "10:20" },
  { start: "10:30", end: "11:20" },
  { start: "11:30", end: "12:20" },
  { start: "13:20", end: "14:10" },
  { start: "14:20", end: "15:10" },
  { start: "15:20", end: "16:10" },
  { start: "16:30", end: "17:20" },
];

function getTimeInMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function getDelayUntilClassEnds() {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  for (const period of classSchedule) {
    const startMins = getTimeInMinutes(period.start);
    const endMins = getTimeInMinutes(period.end);
    
    if (currentMinutes >= startMins && currentMinutes < endMins) {
      // Calculate delay in milliseconds until the class ends
      const endHour = Math.floor(endMins / 60);
      const endMinute = endMins % 60;
      const targetTime = new Date(now);
      targetTime.setHours(endHour, endMinute, 0, 0);
      return targetTime.getTime() - now.getTime();
    }
  }
  return 0; // Not in class
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    frame: false,
    fullscreenable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000/#tv-setup');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'), { hash: 'tv-setup' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function showPopup() {
  if (!mainWindow) return;
  
  if (hideTimeout) clearTimeout(hideTimeout);
  
  if (mainWindow.isMinimized()) mainWindow.restore();
  
  mainWindow.show();
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setFullScreen(true);
  mainWindow.focus();
  
  setTimeout(() => {
    if (mainWindow) mainWindow.setAlwaysOnTop(false);
  }, 2000);
  
  hideTimeout = setTimeout(() => {
    if (mainWindow) {
      mainWindow.setFullScreen(false);
      mainWindow.hide();
    }
  }, 60000);
}


app.whenReady().then(() => {
  if (app.isPackaged) {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: true,
      args: ['--hidden']
    });
  }

  createWindow();

  tray = new Tray(path.join(__dirname, 'public', 'icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: '종료', click: () => app.quit() }
  ]);
  tray.setContextMenu(contextMenu);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on('trigger-my-call', () => {
  if (scheduledShowTimeout) {
    clearTimeout(scheduledShowTimeout);
    scheduledShowTimeout = null;
  }

  const delay = getDelayUntilClassEnds();
  
  if (delay > 0) {
    console.log(`Currently in class. Delaying popup for ${delay}ms`);
    scheduledShowTimeout = setTimeout(() => {
      showPopup();
    }, delay);
  } else {
    showPopup();
  }
});

// Reuse existing IPC handlers if needed, though class view might only receive notifications.
// I'll keep the file lean and focused on just the notification popup.
