const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { GoogleGenAI, Type } = require('@google/genai');

let mainWindow;
let tray = null;
let hideTimeout = null;

function getIconPath() {
  const possibleIcons = [
    path.join(__dirname, 'public', 'icon.ico'),
    path.join(__dirname, 'public', 'icon.png'),
    path.join(__dirname, 'public', 'icon.jpg'),
    path.join(__dirname, 'icon.ico'),
    path.join(__dirname, 'icon.png')
  ];
  return possibleIcons.find(p => fs.existsSync(p)) || possibleIcons[1];
}

function createWindow() {
  const iconPath = getIconPath();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: true,
    fullscreenable: true,
    resizable: true,
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

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'Escape') {
      if (mainWindow.isFullScreen()) {
        mainWindow.setFullScreen(false);
      }
      mainWindow.hide();
      event.preventDefault();
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  tray = new Tray(path.join(__dirname, 'public', 'icon.ico'));
  tray.setToolTip('학교 호출 앱');

  const contextMenu = Menu.buildFromTemplate([
    { 
      label: '열기', 
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
        } else {
          createWindow();
        }
      } 
    },
    { 
      label: '종료', 
      click: () => {
        app.quit();
      } 
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
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

// 호출 및 전달사항 이벤트 수신 시 윈도우 강제 최상단 전체화면 팝업 처리
ipcMain.on('trigger-my-call', () => {
  if (mainWindow) {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }

    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setFullScreen(true);
    mainWindow.focus();

    // 2초 뒤 최상단 강제 고정 해제 (사용성 고려: 다른 작업으로 전환 가능하도록)
    setTimeout(() => {
      if (mainWindow) {
        mainWindow.setAlwaysOnTop(false);
      }
    }, 2000);

    // 1분 뒤 자동 숨김 처리
    hideTimeout = setTimeout(() => {
      if (mainWindow) {
        mainWindow.setFullScreen(false);
        mainWindow.hide();
      }
    }, 60000);
  }
});

// AI 자동 추출 IPC 핸들러 (Gemini API 호출)
ipcMain.handle('extract-meal', async (event, { base64, mimeType }) => {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' }
      }
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        { inlineData: { data: base64, mimeType } },
        { text: "Extract the lunch and dinner menu from this image or document. Return a JSON object with 'lunch' and 'dinner' arrays containing strings of food items. Ignore times, dates, or nutritional info. Just the food names." }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lunch: { type: Type.ARRAY, items: { type: Type.STRING } },
            dinner: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["lunch", "dinner"]
        }
      }
    });
    
    return JSON.parse(response.text);
  } catch (err) {
    console.error('AI Extraction Error:', err);
    throw err;
  }
});

// AI 시간표 추출 IPC 핸들러
ipcMain.handle('extract-timetable', async (event, { base64, mimeType }) => {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' }
      }
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        { inlineData: { data: base64, mimeType } },
        { text: "Extract the weekly school timetable from this image/document. Return a JSON object with keys '1', '2', '3', '4', '5' representing Monday to Friday. Each key should have an array of exactly 7 strings representing the subjects for periods 1 to 7. If a period is empty, use an empty string. Ignore times and teachers, just the subject names." }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            "1": { type: Type.ARRAY, items: { type: Type.STRING } },
            "2": { type: Type.ARRAY, items: { type: Type.STRING } },
            "3": { type: Type.ARRAY, items: { type: Type.STRING } },
            "4": { type: Type.ARRAY, items: { type: Type.STRING } },
            "5": { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["1", "2", "3", "4", "5"]
        }
      }
    });
    
    return JSON.parse(response.text);
  } catch (err) {
    console.error('AI Timetable Extraction Error:', err);
    throw err;
  }
});

// AI URL 급식 추출 IPC 핸들러
ipcMain.handle('extract-meal-url', async (event, { url, date }) => {
  try {
    const fetchRes = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const html = await fetchRes.text();

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' }
      }
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Extract the lunch and dinner menu for the date ${date} (Format: YYYYMMDD) from the following school webpage HTML. 
Return a JSON object with 'lunch' and 'dinner' arrays containing strings of food items. Ignore times, dates, or nutritional info. Just the food names.
If the menu for the specific date is not found in the HTML, return empty arrays.
HTML Content:
${html.substring(0, 100000)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lunch: { type: Type.ARRAY, items: { type: Type.STRING } },
            dinner: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["lunch", "dinner"]
        }
      }
    });
    
    return JSON.parse(response.text);
  } catch (err) {
    console.error('AI URL Extraction Error:', err);
    throw err;
  }
});

// AI OCR 텍스트 기반 급식 정제 IPC 핸들러
ipcMain.handle('refine-meal-text', async (event, { text, date }) => {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' }
      }
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Here is raw OCR text extracted from a school meal schedule. Extract the lunch and dinner menu for the date ${date} (Format: YYYYMMDD). 
Return a JSON object with 'lunch' and 'dinner' arrays containing strings of food items. Ignore times, dates, or nutritional info. Just the food names.
If the menu for the specific date is not found in the text, return empty arrays.
Raw OCR Text:
${text.substring(0, 50000)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lunch: { type: Type.ARRAY, items: { type: Type.STRING } },
            dinner: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["lunch", "dinner"]
        }
      }
    });
    
    return JSON.parse(response.text);
  } catch (err) {
    console.error('AI OCR Refine Error:', err);
    throw err;
  }
});

// AI OCR 텍스트 기반 시간표 정제 IPC 핸들러
ipcMain.handle('refine-timetable-text', async (event, { text }) => {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' }
      }
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Here is raw OCR text extracted from a class timetable. Extract the schedule. Return a JSON object where keys are "1", "2", "3", "4", "5" representing Monday to Friday. The values should be arrays of strings representing the subjects from period 1 to 7. Ignore times, teacher names, etc.
If a period is empty, use an empty string "".
Raw OCR Text:
${text.substring(0, 50000)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            "1": { type: Type.ARRAY, items: { type: Type.STRING } },
            "2": { type: Type.ARRAY, items: { type: Type.STRING } },
            "3": { type: Type.ARRAY, items: { type: Type.STRING } },
            "4": { type: Type.ARRAY, items: { type: Type.STRING } },
            "5": { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["1", "2", "3", "4", "5"]
        }
      }
    });
    
    return JSON.parse(response.text);
  } catch (err) {
    console.error('AI Timetable Refine Error:', err);
    throw err;
  }
});


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
