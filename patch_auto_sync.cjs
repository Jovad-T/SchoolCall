const fs = require('fs');

const syncCode = `

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
                if (val.match(/^[0-9]+반$/) || val.match(/^[0-9]+-[0-9]+$/) || val.match(/^[0-9]+학년\\s*[0-9]+반$/)) {
                  className = val;
                }
              }
            }
            
            let gradeStr = defaultGrade;
            let classStr = "1";
            const m1 = className.match(/([0-9]+)학년\\s*([0-9]+)반/);
            const m2 = className.match(/([0-9]+)-([0-9]+)/);
            const m3 = className.match(/([0-9]+)반/);
            if (m1) { gradeStr = m1[1]; classStr = m1[2]; }
            else if (m2) { gradeStr = m2[1]; classStr = m2[2]; }
            else if (m3) { classStr = m3[1]; }
            else {
              const m4 = className.match(/^([0-9]+)$/);
              if (m4) classStr = m4[1];
            }

            const classKey = \`\${gradeStr}-\${classStr}\`;
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

    console.log('[자동 갱신] 압핀 시간표 파싱 성공:', FULL_FILE_PATH, \`(업데이트: \${updatedClasses}학급)\`);
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
        console.log("Could not create C:\\\\AppinData", e.message);
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
      console.log(\`[감지됨] 압핀 엑셀 파일 변경: \${filePath}\`);
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
`;

['class.cjs', 'main.cjs'].forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('initAppinAutoSync')) {
    fs.writeFileSync(file, content + syncCode);
  }
});
