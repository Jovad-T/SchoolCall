import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# 1. Import XLSX
if "import * as XLSX" not in content:
    content = content.replace("import { useState, useEffect, useRef } from 'react';", "import { useState, useEffect, useRef } from 'react';\nimport * as XLSX from 'xlsx';")

# 2. Modify handleTimetableImageUpload
old_handler_start = """  const handleTimetableImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const apiKey = schoolConfig.geminiApiKey || schoolConfig.neisApiKey;"""

new_handler_start = """  const handleTimetableImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      setIsNeisLoading(true);
      setTimetableFileName(file.name);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const wb = XLSX.read(arrayBuffer);
        const newTimetables = { ...tempClassTimetables };
        let updatedClasses = 0;

        wb.SheetNames.forEach(sheetName => {
          const ws = wb.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
          
          let defaultGrade = String(editTargetGrade);
          if (sheetName.includes('1')) defaultGrade = '1';
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
                let classStr = "";
                const m1 = className.match(/([0-9]+)학년\s*([0-9]+)반/);
                const m2 = className.match(/([0-9]+)-([0-9]+)/);
                const m3 = className.match(/([0-9]+)반/);
                if (m1) { gradeStr = m1[1]; classStr = m1[2]; }
                else if (m2) { gradeStr = m2[1]; classStr = m2[2]; }
                else if (m3) { classStr = m3[1]; }
                else {
                  const m4 = className.match(/^([0-9]+)$/);
                  if (m4) classStr = m4[1];
                  else classStr = String(editTargetClass); // fallback
                }

                const cleanSubj = (val: string) => {
                  if (!val) return "-";
                  let s = String(val).trim();
                  s = s.split('/')[0].split('(')[0];
                  s = s.replace(/^[A-Z](?=[가-힣])/, '');
                  s = s.trim();
                  return s || "-";
                };

                const classKey = `${gradeStr}-${classStr}`;
                if (!newTimetables[classKey]) newTimetables[classKey] = {};
                
                // Read 7 periods (r+1 to r+7)
                for (let period = 1; period <= 7; period++) {
                  const targetRow = data[r + period];
                  if (!targetRow) continue;
                  
                  // Days: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri
                  for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
                    const dayKey = String(dayOffset + 1); // 1 to 5
                    if (!newTimetables[classKey][dayKey]) newTimetables[classKey][dayKey] = {};
                    newTimetables[classKey][dayKey][period] = cleanSubj(targetRow[c + dayOffset]);
                  }
                }
                updatedClasses++;
              }
            }
          }
        });

        setTempClassTimetables(newTimetables);
        alert(`✅ 컴시간/압핀 엑셀 분석 완료! 총 ${updatedClasses}개 학급의 시간표가 일괄 업데이트되었습니다.`);
      } catch (err) {
        console.error(err);
        alert('❌ 엑셀 파싱 중 오류가 발생했습니다.');
      } finally {
        setIsNeisLoading(false);
      }
      return;
    }

    const apiKey = schoolConfig.geminiApiKey || schoolConfig.neisApiKey;"""

content = content.replace(old_handler_start, new_handler_start)

# 3. Update the UI text
old_ui_text = """<span className="text-sm font-bold text-emerald-200">자동 파싱 (Gemini API)</span>"""
new_ui_text = """<span className="text-sm font-bold text-emerald-200">엑셀/이미지 자동 인식 (컴시간/압핀 연동)</span>"""
content = content.replace(old_ui_text, new_ui_text)

old_ui_text2 = """{timetableFileName || '학급 시간표 파일(이미지/엑셀 등) 업로드하여 자동 채우기'}"""
new_ui_text2 = """{timetableFileName || '컴시간/압핀 엑셀 파일(.xlsx) 업로드 (전교생 일괄 갱신)'}"""
content = content.replace(old_ui_text2, new_ui_text2)

old_ui_desc = """※ 이미지를 업로드하면 인공지능이 과목명을 자동으로 분석하여 빈칸을 채워줍니다. (API 키 필요)"""
new_ui_desc = """※ 컴시간/압핀 엑셀 파일을 올리면 전체 학급이 1초 만에 최신화됩니다. (이미지는 현재 학급만 AI로 분석)"""
content = content.replace(old_ui_desc, new_ui_desc)

with open("src/App.tsx", "w") as f:
    f.write(content)

