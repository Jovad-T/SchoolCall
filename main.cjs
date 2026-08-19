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
ipcMain.on('trigger-call', () => {
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
      model: "gemini-3.7-flash",
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
      model: "gemini-3.7-flash",
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
      model: "gemini-3.7-flash",
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
      model: "gemini-3.7-flash",
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
      model: "gemini-3.7-flash",
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
