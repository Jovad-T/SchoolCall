const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  const fs = require('fs');
  const possibleIcons = [
    path.join(__dirname, 'public', 'icon.ico'),
    path.join(__dirname, 'public', 'icon.png'),
    path.join(__dirname, 'public', 'icon.jpg'),
    path.join(__dirname, 'icon.ico'),
    path.join(__dirname, 'icon.png')
  ];
  
  const iconPath = possibleIcons.find(p => fs.existsSync(p)) || possibleIcons[1];

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: true,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const distIndexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(distIndexPath)) {
    mainWindow.loadFile(distIndexPath, { hash: '/class' });
  } else {
    const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';
    mainWindow.loadURL(`${startUrl}/#/class`);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

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

// 호출 및 전달사항 이벤트 수신 시 윈도우 강제 최상단 전체화면 팝업 처리
ipcMain.on('trigger-call', () => {
  if (mainWindow) {
    mainWindow.show();
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setFullScreen(true);
    mainWindow.focus();

    // 2초 뒤 최상단 강제 고정 해제 (사용성 고려: 다른 작업으로 전환 가능하도록)
    setTimeout(() => {
      if (mainWindow) {
        mainWindow.setAlwaysOnTop(false);
      }
    }, 2000);
  }
});
