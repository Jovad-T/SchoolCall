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


// --- [Appin (압핀) 엑셀 자동 동기화 엔진] ---
const fs_appin = require('fs');
const chokidar_appin = require('chokidar');
const xlsx_appin = require('xlsx');

const APPIN_WATCH_DIR = path.join('C:', 'AppinData'); 
const TARGET_FILE_NAME = 'timetable.xlsx';
const FULL_FILE_PATH = path.join(APPIN_WATCH_DIR, TARGET_FILE_NAME);

function cleanSubjectName(rawText) {
  if (!rawText) return '-';
  let s = String(rawText).trim();
  s = s.split('/')[0].split('(')[0];
  s = s.replace(/^[A-Z](?=[가-힣])/, '');
  s = s.trim();
  return s || '-';
}

function parseAppinExcel(filePath) {
  try {
    const workbook = xlsx_appin.readFile(filePath);
    const newTimetables = {};
    let updatedClasses = 0;

    workbook.SheetNames.forEach(sheetName => {
      const ws = workbook.Sheets[sheetName];
      const data = xlsx_appin.utils.sheet_to_json(ws, { header: 1 });
      
      let defaultGrade = "1";
      if (sheetName.includes('2')) defaultGrade = '2';
      if (sheetName.includes('3')) defaultGrade = '3';

      for (let r = 0; r < data.length; r++) {
        const row = data[r];
        if (!row) continue;
        for (let c = 0; c < row.length; c++) {
          if (row[c] === '월' && row[c+1] === '화' && row[c+2] === '수' && row[c+3] === '목' && row[c+4] === '금') {
            let className = '';
            for (let searchRow = Math.max(0, r - 4); searchRow < r; searchRow++) {
              for (let searchCol = Math.max(0, c - 2); searchCol <= c + 4; searchCol++) {
                const val = String(data[searchRow]?.[searchCol] || '').trim();
                if (val.match(/^[0-9]+반$/) || val.match(/^[0-9]+-[0-9]+$/) || val.match(/^[0-9]+학년\s*[0-9]+반$/)) {
                  className = val;
                }
              }
            }
            
            let gradeStr = defaultGrade;
            let classStr = "1";
            const m1 = className.match(/([0-9]+)학년\s*([0-9]+)반/);
            const m2 = className.match(/([0-9]+)-([0-9]+)/);
            const m3 = className.match(/([0-9]+)반/);
            if (m1) { gradeStr = m1[1]; classStr = m1[2]; }
            else if (m2) { gradeStr = m2[1]; classStr = m2[2]; }
            else if (m3) { classStr = m3[1]; }
            else {
              const m4 = className.match(/^([0-9]+)$/);
              if (m4) classStr = m4[1];
            }

            const classKey = `${gradeStr}-${classStr}`;
            if (!newTimetables[classKey]) newTimetables[classKey] = {};
            
            for (let period = 1; period <= 7; period++) {
              const targetRow = data[r + period];
              if (!targetRow) continue;
              
              for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
                const dayKey = String(dayOffset + 1); 
                if (!newTimetables[classKey][dayKey]) newTimetables[classKey][dayKey] = {};
                newTimetables[classKey][dayKey][period] = cleanSubjectName(targetRow[c + dayOffset]);
              }
            }
            updatedClasses++;
          }
        }
      }
    });

    console.log('[자동 갱신] 압핀 시간표 파싱 성공:', FULL_FILE_PATH, `(업데이트: ${updatedClasses}학급)`);
    return { success: true, data: newTimetables, count: updatedClasses };
  } catch (error) {
    console.error('[자동 갱신 오류] 엑셀 파싱 실패:', error);
    return { success: false, error: error.message };
  }
}

function initAppinAutoSync() {
  try {
    if (!fs_appin.existsSync(APPIN_WATCH_DIR)) {
      try {
        fs_appin.mkdirSync(APPIN_WATCH_DIR, { recursive: true });
      } catch (e) {
        console.log("Could not create C:\\AppinData", e.message);
      }
    }

    const watcher = chokidar_appin.watch(FULL_FILE_PATH, {
      persistent: true,
      ignoreInitial: false, 
      awaitWriteFinish: {   
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    });

    const triggerUpdate = (filePath) => {
      console.log(`[감지됨] 압핀 엑셀 파일 변경: ${filePath}`);
      const result = parseAppinExcel(filePath);
      if (result.success && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('timetable-auto-updated', result.data);
      }
    };

    watcher.on('change', triggerUpdate);
    watcher.on('add', triggerUpdate);
    console.log("Appin Watcher Started at", FULL_FILE_PATH);
  } catch (e) {
    console.log("Appin watcher init failed", e.message);
  }
}

app.whenReady().then(() => {
  setTimeout(initAppinAutoSync, 2000);
});


ipcMain.handle('fetch-local-url', async (event, { url }) => {
  try {
    const res = await fetch(url.startsWith('http') ? url : 'http://' + url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });
    const text = await res.text();
    return { success: true, data: text };
  } catch (err) {
    console.error('Local fetch error:', err);
    return { success: false, error: err.message };
  }
});
