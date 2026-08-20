import React, { useRef, useState, useEffect } from 'react';
import { ref, set, onValue } from 'firebase/database';
import { db } from '../lib/firebase';
import { setGlobalStudents, useSchoolStructure, useClassTimetable, useClassTimetableImage, useCustomMeal, useAllCustomMeals, useRooms } from '../lib/store';
import { extractTimetableFromImage, extractTeacherScheduleFromImage, extractMealFromImageOrText, extractAllMealsFromImageOrText, ExtractedMealItem } from '../lib/gemini';
import { Upload, Home, Clock, School, Calendar, Image as ImageIcon, Trash2, Utensils, Wand2, Plus, Check, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Tesseract from 'tesseract.js';

function formatDateWithDay(dateStr: string) {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  const y = dateStr.substring(0, 4);
  const m = dateStr.substring(4, 6);
  const d = dateStr.substring(6, 8);
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  try {
    const dateObj = new Date(`${y}-${m}-${d}`);
    const dayIndex = dateObj.getDay();
    const dayName = isNaN(dayIndex) ? '' : dayNames[dayIndex];
    return `${y}.${m}.${d} (${dayName})`;
  } catch {
    return `${y}.${m}.${d}`;
  }
}


const TimetableCell: React.FC<{ value: string, onChange: (val: string) => void }> = ({ value, onChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  
  // Extract subject and teacher
  const parts = value.split(/[\/\n]/);
  const subject = parts[0]?.trim() || '';
  const teacher = parts.slice(1).join('/').trim() || '';

  if (isEditing) {
    return (
      <textarea
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setIsEditing(false)}
        className="w-full bg-[#1A1A1C] p-3 rounded-xl border border-brand-green text-white outline-none text-center text-sm min-h-[4rem] resize-none break-keep whitespace-pre-wrap"
        placeholder="과목명/교사명"
      />
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className="w-full bg-[#1A1A1C] p-3 rounded-xl border border-[#444] hover:border-brand-green cursor-text flex flex-col justify-center items-center min-h-[4rem] transition-colors"
    >
      {value ? (
        <>
          <span className="font-bold text-white text-sm break-keep text-center leading-tight">{subject}</span>
          {teacher && <span className="text-[11px] text-white/70 mt-1 break-keep text-center">{teacher}</span>}
        </>
      ) : (
        <span className="text-[#555] text-[10px]">입력</span>
      )}
    </div>
  );
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [manualCsvText, setManualCsvText] = useState('');

  const [schedule, setSchedule] = useState<{period: number; start: string; end: string}[]>(
    Array.from({length: 7}, (_, i) => ({ period: i + 1, start: '', end: '' }))
  );
  const [scheduleStatus, setScheduleStatus] = useState<string | null>(null);

  const [schoolName, setSchoolName] = useState<string>('');
  const [schoolNameStatus, setSchoolNameStatus] = useState<string | null>(null);

  const { structure, isLoading: isStructureLoading } = useSchoolStructure();
  const [ttGrade, setTtGrade] = useState<string>('');
  const [ttClassNm, setTtClassNm] = useState<string>('');
  const [ttStatus, setTtStatus] = useState<string | null>(null);

  const availableGrades = Object.keys(structure).sort((a, b) => Number(a) - Number(b));
  const availableClasses = ttGrade ? (structure[ttGrade] || []).sort((a, b) => Number(a) - Number(b)) : [];

  useEffect(() => {
    if (!isStructureLoading && availableGrades.length > 0) {
      if (!availableGrades.includes(ttGrade)) {
        setTtGrade(availableGrades[0]);
      } else if (availableClasses.length > 0 && !availableClasses.includes(ttClassNm)) {
        setTtClassNm(availableClasses[0]);
      }
    }
  }, [structure, ttGrade, ttClassNm, isStructureLoading, availableGrades, availableClasses]);

  
  const { customTimetable, updateCustomTimetable } = useClassTimetable(ttGrade, ttClassNm);
  const { timetableImage, updateTimetableImage } = useClassTimetableImage(ttGrade, ttClassNm);
  const [imageFile, setImageFile] = useState<string | null>(null);

  const [mealDate, setMealDate] = useState(new Date().toISOString().split("T")[0].replace(/-/g, ""));
  const { customMeal, updateCustomMeal } = useCustomMeal(mealDate);
  const { allMeals, saveMultipleCustomMeals, deleteCustomMeal, clearAllCustomMeals } = useAllCustomMeals();
  const [extractedMeals, setExtractedMeals] = useState<ExtractedMealItem[]>([]);
  const [isExtractingMeal, setIsExtractingMeal] = useState(false);
  const [isSavingBulkMeals, setIsSavingBulkMeals] = useState(false);
  const [mealFilterKeyword, setMealFilterKeyword] = useState('');
  const [showSavedMealsList, setShowSavedMealsList] = useState(false);
  
  const [mealStatus, setMealStatus] = useState<string | null>(null);
  const [localMeal, setLocalMeal] = useState<{lunch: string, dinner: string}>({lunch: '', dinner: ''});
  const [mealUrl, setMealUrl] = useState('');
  const [isExtractingUrl, setIsExtractingUrl] = useState(false);
  
  const [isExtractingTt, setIsExtractingTt] = useState(false);
  const [isExtractingTeacher, setIsExtractingTeacher] = useState(false);
  const [teacherTtStatus, setTeacherTtStatus] = useState<string | null>(null);
  const { rooms, updateRooms } = useRooms();

  useEffect(() => {
    if (customMeal && customMeal.date === mealDate) {
      setLocalMeal({
        lunch: customMeal.lunch ? customMeal.lunch.join('\n') : '',
        dinner: customMeal.dinner ? customMeal.dinner.join('\n') : ''
      });
    } else {
      setLocalMeal({lunch: '', dinner: ''});
    }
  }, [customMeal, mealDate]);

  const handleMealImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert("파일 크기는 15MB 이하여야 합니다.");
      return;
    }

    setIsExtractingMeal(true);
    setMealStatus("Gemini AI가 식단표를 분석하여 모든 날짜의 메뉴를 추출하고 있습니다... (약 5~15초)");

    try {
      const list = await extractAllMealsFromImageOrText(file, mealDate);

      if (list && list.length > 0) {
        setExtractedMeals(list);
        const match = list.find(m => m.date === mealDate) || list[0];
        if (match) {
          setMealDate(match.date);
          setLocalMeal({
            lunch: match.lunch.join('\n'),
            dinner: match.dinner.join('\n')
          });
        }
        setMealStatus(`✅ 총 ${list.length}일치의 식단 데이터가 추출되었습니다! 아래 목록에서 검토 후 '전체 식단 일괄 저장'을 눌러주세요.`);
      } else {
        setMealStatus("⚠️ 식단표 이미지에서 유효한 날짜별 식단 정보를 찾지 못했습니다.");
      }
    } catch (err: any) {
      console.error("Meal extraction error:", err);
      setMealStatus(`❌ 분석 실패: ${err.message || '알 수 없는 오류가 발생했습니다.'}`);
    } finally {
      setIsExtractingMeal(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleExtractTeacherSchedule = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("파일 크기는 10MB 이하여야 합니다.");
      return;
    }

    setIsExtractingTeacher(true);
    setTeacherTtStatus("Gemini AI가 이미지를 분석하여 교사별 시간표를 추출하고 있습니다... (약 5~10초 소요)");

    try {
      const extractedData = await extractTeacherScheduleFromImage(file);
      
      if (Array.isArray(extractedData) && extractedData.length > 0) {
        // Mapping Logic
        let newRooms = [...rooms];
        let matchedCount = 0;
        const mappedTeachers = new Set();
        
        extractedData.forEach(item => {
           // Find teacher in rooms
           const roomIndex = newRooms.findIndex(r => r.teacherName === item.teacherName);
           if (roomIndex !== -1) {
              const scheduleItem = newRooms[roomIndex].schedule || [];
              
              // Map period to time string based on global 'schedule' state
              let timeStr = "";
              if (schedule.length >= item.period) {
                 const slot = schedule[item.period - 1];
                 timeStr = `${slot.start}~${slot.end}`;
              } else {
                 // Fallback mapping
                 const defaultTimes = ["09:00~09:50", "10:00~10:50", "11:00~11:50", "12:00~12:50", "14:00~14:50", "15:00~15:50", "16:00~16:50", "17:00~17:50", "18:00~18:50"];
                 timeStr = defaultTimes[item.period - 1] || "";
              }
              
              const existingIdx = scheduleItem.findIndex(s => s.dayOfWeek === item.dayOfWeek && s.period === item.period);
              if (existingIdx !== -1) {
                  scheduleItem[existingIdx] = { dayOfWeek: item.dayOfWeek, period: item.period, subject: item.subject, time: timeStr };
              } else {
                  scheduleItem.push({ dayOfWeek: item.dayOfWeek, period: item.period, subject: item.subject, time: timeStr });
              }
              
              newRooms[roomIndex].schedule = scheduleItem;
              mappedTeachers.add(item.teacherName);
           }
        });
        
        await updateRooms(newRooms);
        setTeacherTtStatus(`✅ 총 ${mappedTeachers.size}명의 선생님 시간표가 성공적으로 연동되었습니다.`);
      } else {
        setTeacherTtStatus("⚠️ 이미지에서 교사 시간표 정보를 찾지 못했습니다.");
      }
    } catch (err: any) {
      console.error("AI extraction error:", err);
      setTeacherTtStatus(`❌ AI 분석 중 오류: ${err?.message || "알 수 없는 오류"}`);
    } finally {
      setIsExtractingTeacher(false);
      setTimeout(() => setTeacherTtStatus(null), 5000);
      if (e.target) e.target.value = '';
    }
  };


  const handleMealUrlExtraction = async () => {
    if (!mealUrl.trim()) {
      alert("학교 급식 페이지의 URL 링크를 입력해주세요.");
      return;
    }

    setIsExtractingUrl(true);
    setMealStatus("입력하신 링크에서 식단 정보를 찾고 있습니다...");

    try {
      let list: ExtractedMealItem[] = [];
      if (typeof window !== 'undefined' && (window as any).electron?.invoke) {
        const data = await (window as any).electron.invoke('extract-meal-url', { url: mealUrl, date: mealDate });
        if (data) {
          list = [{ date: mealDate, lunch: data.lunch || [], dinner: data.dinner || [] }];
        }
      } else {
        try {
          const proxyRes = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(mealUrl)}`);
          if (proxyRes.ok) {
            const proxyData = await proxyRes.json();
            if (proxyData.contents) {
              list = await extractAllMealsFromImageOrText(proxyData.contents, mealDate);
            }
          }
        } catch (e) {
          console.warn("CORS proxy fetch failed:", e);
        }
        if (!list || list.length === 0) {
          throw new Error("브라우저 환경에서는 외부 URL 직접 접근이 제한될 수 있습니다. 식단표 이미지 파일 업로드 기능을 이용해 주세요.");
        }
      }

      if (list && list.length > 0) {
        setExtractedMeals(list);
        const match = list.find(m => m.date === mealDate) || list[0];
        if (match) {
          setMealDate(match.date);
          setLocalMeal({
            lunch: match.lunch.join('\n'),
            dinner: match.dinner.join('\n')
          });
        }
        setMealStatus(`✅ 링크에서 총 ${list.length}일치의 급식 정보를 추출했습니다. 목록을 확인 후 일괄 저장해주세요.`);
      } else {
        setMealStatus("⚠️ 해당 링크에서 유효한 식단 정보를 찾지 못했습니다.");
      }
    } catch (err: any) {
      console.error("Meal URL extraction error:", err);
      setMealStatus(`❌ 링크 분석 오류: ${err.message || '알 수 없는 오류가 발생했습니다.'}`);
    } finally {
      setIsExtractingUrl(false);
    }
  };

  const handleSaveAllExtractedMeals = async () => {
    if (extractedMeals.length === 0) {
      alert("저장할 추출 식단이 없습니다.");
      return;
    }
    setIsSavingBulkMeals(true);
    try {
      await saveMultipleCustomMeals(extractedMeals);
      setMealStatus(`✅ 총 ${extractedMeals.length}일치의 급식 정보가 Firebase에 일괄 저장되었습니다. 교실 TV 화면에 즉시 우선 적용됩니다.`);
      setTimeout(() => setMealStatus(null), 5000);
    } catch (err: any) {
      console.error("Batch meal save error:", err);
      setMealStatus(`❌ 일괄 저장 중 오류 발생: ${err?.message || '알 수 없는 오류'}`);
    } finally {
      setIsSavingBulkMeals(false);
    }
  };

  const handleSaveSingleExtractedMeal = async (item: ExtractedMealItem) => {
    try {
      await saveMultipleCustomMeals([item]);
      setMealStatus(`✅ ${formatDateWithDay(item.date)} 급식 정보가 저장되었습니다.`);
      setTimeout(() => setMealStatus(null), 3000);
    } catch (err: any) {
      alert(`저장 오류: ${err?.message || '알 수 없는 오류'}`);
    }
  };

  const handleExtractedMealDateChange = (index: number, newDate: string) => {
    const updated = [...extractedMeals];
    updated[index] = {
      ...updated[index],
      date: newDate.replace(/[^0-9]/g, '')
    };
    setExtractedMeals(updated);
  };

  const handleExtractedMealMenuChange = (index: number, type: 'lunch' | 'dinner', text: string) => {
    const updated = [...extractedMeals];
    updated[index] = {
      ...updated[index],
      [type]: text.split('\n').map(s => s.trim()).filter(Boolean)
    };
    setExtractedMeals(updated);
  };

  const handleRemoveExtractedMeal = (index: number) => {
    setExtractedMeals(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddExtractedMealRow = () => {
    let nextDate = new Date().toISOString().split("T")[0].replace(/-/g, "");
    if (extractedMeals.length > 0) {
      const lastDate = extractedMeals[extractedMeals.length - 1].date;
      if (lastDate && lastDate.length === 8) {
        const y = parseInt(lastDate.substring(0, 4), 10);
        const m = parseInt(lastDate.substring(4, 6), 10) - 1;
        const d = parseInt(lastDate.substring(6, 8), 10);
        const nextDateObj = new Date(y, m, d + 1);
        const yStr = nextDateObj.getFullYear().toString();
        const mStr = String(nextDateObj.getMonth() + 1).padStart(2, '0');
        const dStr = String(nextDateObj.getDate()).padStart(2, '0');
        nextDate = `${yStr}${mStr}${dStr}`;
      }
    }
    setExtractedMeals(prev => [...prev, { date: nextDate, lunch: [], dinner: [] }]);
  };

  const handleSaveMeal = async () => {
    if (!localMeal.lunch.trim() && !localMeal.dinner.trim()) {
      await updateCustomMeal(null);
      setMealStatus("✅ 급식 정보가 초기화(삭제)되었습니다. (나이스 데이터 사용)");
    } else {
      await updateCustomMeal({
        date: mealDate,
        lunch: localMeal.lunch.split('\n').map(s => s.trim()).filter(Boolean),
        dinner: localMeal.dinner.split('\n').map(s => s.trim()).filter(Boolean)
      });
      setMealStatus(`✅ ${formatDateWithDay(mealDate)} 급식 정보가 성공적으로 저장되었습니다. (교실 화면에 우선 적용됩니다)`);
    }
    setTimeout(() => setMealStatus(null), 3000);
  };
  
  useEffect(() => {
    setImageFile(timetableImage || null);
  }, [timetableImage, ttGrade, ttClassNm]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("이미지 크기는 2MB 이하여야 합니다.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageFile(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveImageTimetable = async () => {
    await updateTimetableImage(imageFile);
    setTtStatus("✅ 시간표 이미지가 저장되었습니다.");
    setTimeout(() => setTtStatus(null), 3000);
  };

  const handleTtAiExtraction = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("파일 크기는 10MB 이하여야 합니다.");
      return;
    }

    setIsExtractingTt(true);
    setTtStatus("Gemini AI가 시간표 이미지를 분석하여 과목을 추출하고 있습니다... (약 5~10초)");

    try {
      // 100% Client-side Gemini Multimodal Extraction (no backend API route needed)
      const data = await extractTimetableFromImage(file);

      if (data && typeof data === 'object') {
        const merged = { ...localTimetable };
        for (let i = 1; i <= 5; i++) {
          if (data[i.toString()] && Array.isArray(data[i.toString()])) {
             const arr = data[i.toString()];
             const padded = Array(7).fill("");
             for (let j = 0; j < 7 && j < arr.length; j++) {
               padded[j] = arr[j] || "";
             }
             merged[i.toString()] = padded;
          }
        }
        setLocalTimetable(merged);
        setTtStatus("✅ 시간표 추출 및 정제가 완료되었습니다. 내역을 확인 후 저장해주세요.");
      } else {
        throw new Error("유효한 시간표 데이터를 추출하지 못했습니다.");
      }
    } catch (err: any) {
      console.error("Timetable extraction error:", err);
      const errMsg = err?.message || "분석 중 오류가 발생했습니다.";
      setTtStatus(`❌ ${errMsg}`);
    } finally {
      setIsExtractingTt(false);
      setTimeout(() => setTtStatus(null), 5000);
      if (e.target) e.target.value = '';
    }
  };

  const [localTimetable, setLocalTimetable] = useState<Record<string, string[]>>({
    "1": Array(7).fill(""),
    "2": Array(7).fill(""),
    "3": Array(7).fill(""),
    "4": Array(7).fill(""),
    "5": Array(7).fill("")
  });

  useEffect(() => {
    if (customTimetable && Object.keys(customTimetable).length > 0) {
      // Ensure all 5 days exist
      const merged = { ...localTimetable };
      for (let i = 1; i <= 5; i++) {
        merged[i.toString()] = customTimetable[i.toString()] || Array(7).fill("");
      }
      setLocalTimetable(merged);
    } else {
      setLocalTimetable({
        "1": Array(7).fill(""),
        "2": Array(7).fill(""),
        "3": Array(7).fill(""),
        "4": Array(7).fill(""),
        "5": Array(7).fill("")
      });
    }
  }, [customTimetable, ttGrade, ttClassNm]);

  const handleTimetableChange = (day: string, periodIndex: number, value: string) => {
    const newTt = { ...localTimetable };
    newTt[day][periodIndex] = value;
    setLocalTimetable(newTt);
  };

  const handleSaveTimetable = async () => {
    await updateCustomTimetable(localTimetable);
    setTtStatus("✅ 시간표가 저장되었습니다.");
    setTimeout(() => setTtStatus(null), 3000);
  };



  useEffect(() => {
    if (!db) return;
    const scheduleRef = ref(db, 'school_data/schedule');
    const unsub = onValue(scheduleRef, (snapshot) => {
      if (snapshot.exists()) {
        setSchedule(snapshot.val());
      }
    });
        const nameRef = ref(db, 'school_data/school_name');
    const nameUnsub = onValue(nameRef, (snapshot) => {
      if (snapshot.exists()) {
        setSchoolName(snapshot.val());
      }
    });

    return () => {
      unsub();
      nameUnsub();
    };
  }, []);

  
  const saveSchoolName = async () => {
    if (!db) {
      alert("Firebase 연결이 필요합니다.");
      return;
    }
    try {
      await set(ref(db, 'school_data/school_name'), schoolName);
      setSchoolNameStatus("✅ 학교명이 성공적으로 저장되었습니다.");
      setTimeout(() => setSchoolNameStatus(null), 3000);
    } catch (err) {
      console.error(err);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  const handleScheduleChange = (index: number, field: 'start' | 'end', value: string) => {
    const newSchedule = [...schedule];
    newSchedule[index][field] = value;
    setSchedule(newSchedule);
  };

  const saveSchedule = async () => {
    if (!db) {
      alert("Firebase 연결이 필요합니다.");
      return;
    }
    try {
      await set(ref(db, 'school_data/schedule'), schedule);
      setScheduleStatus("✅ 일과시간이 성공적으로 저장되었습니다.");
      setTimeout(() => setScheduleStatus(null), 3000);
    } catch (err) {
      console.error(err);
      alert("저장 중 오류가 발생했습니다.");
    }
  };


    
  const parseAndSaveStudents = async (text: string) => {
    try {
      const lines = text.split('\n');
      const groupedData: Record<string, Record<string, string[]>> = {};
      let studentCount = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (!trimmed) continue;
        
        const cleanLine = trimmed.replace(/["']/g, '');
        const parts = cleanLine.split(',').map(p => p.trim());
        
        let id = '';
        let name = '';

        // 4열 형식 (학년, 반, 번호, 성명)
        if (parts.length >= 4 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1])) && !isNaN(Number(parts[2]))) {
          const g = parts[0];
          const c = parts[1];
          const num = parts[2];
          name = parts[3];
          id = `${g}${c.padStart(2, '0')}${num.padStart(2, '0')}`;
        } 
        // 2열 형식 (학번, 성명)
        else if (parts.length >= 2) {
          id = parts[0];
          name = parts[1];
        }
        
        if (id && name && !isNaN(Number(id))) {
          if (id.length >= 4) {
            const g = id[0];
            let c = id.substring(1, id.length - 2);
            if (c.startsWith('0')) c = c.substring(1);
            const num = parseInt(id.slice(-2));
            
            if (!groupedData[g]) groupedData[g] = {};
            if (!groupedData[g][c]) groupedData[g][c] = [];
            
            groupedData[g][c].push(`${num}번 ${name}`);
            studentCount++;
          }
        }
      }
      
      if (studentCount > 0 && db) {
        // Sort arrays before saving
        for (const g in groupedData) {
          for (const c in groupedData[g]) {
            groupedData[g][c].sort((a, b) => parseInt(a) - parseInt(b));
          }
        }
        
        await set(ref(db, 'school_data/students'), groupedData);
        setUploadStatus(`✅ 총 ${studentCount}명의 학생 명단이 서버(Firebase)에 성공적으로 등록되었습니다.`);
        setTimeout(() => setUploadStatus(null), 5000);
      } else if (!db) {
        alert("Firebase가 연결되어 있지 않아 서버에 저장할 수 없습니다.");
      } else {
        alert("유효한 데이터가 없습니다. 예시: '학번,이름'");
      }
    } catch (err) {
      console.error(err);
      alert("데이터 처리 중 오류가 발생했습니다.");
    }
  };

  const handleManualSubmit = async () => {
    if (!manualCsvText.trim()) {
      alert('등록할 텍스트를 입력해 주세요.');
      return;
    }
    await parseAndSaveStudents(manualCsvText);
    setManualCsvText('');
  };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        await parseAndSaveStudents(event.target.result as string);
      }
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-bg-dark grid-bg flex flex-col items-center justify-center p-6 text-[#E0E0E0] font-sans relative">
      <button 
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 z-40 flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 border border-[#333] hover:border-[#555] text-[#AAA] hover:text-white transition-colors backdrop-blur text-xs tracking-widest uppercase"
      >
        <Home className="w-4 h-4" /> 홈으로
      </button>

      <div className="max-w-5xl w-full text-center space-y-12">
        <div className="space-y-4">
          <h2 className="text-brand-red uppercase tracking-[0.2em] text-xs font-bold">Master Admin Only</h2>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white">
            전교생 명렬표 관리(마스터)
          </h1>
        </div>

                        <div className="glass-card p-10 rounded-2xl border border-brand-red/30 flex flex-col w-full">
          <div className="flex items-center gap-3 mb-6 w-full justify-center">
            <Upload className="w-6 h-6 text-brand-red" />
            <h2 className="text-xl font-bold tracking-widest text-white">학생 명단 등록</h2>
          </div>
          
          <p className="text-[#888] text-xs tracking-wider mb-8 text-center leading-relaxed">
            💡 학번, 성명 또는 학년, 반, 번호, 성명 순서로 작성된 데이터를 업로드하거나 입력해 주세요.<br/>
            (헤더가 있거나 없어도 모두 자동 인식합니다)
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {/* Method 1: File Upload */}
            <div className="flex flex-col items-center p-6 bg-[#111] rounded-xl border border-[#333]">
              <h3 className="text-sm font-bold text-white mb-4">방법 1. CSV 파일 업로드</h3>
              <p className="text-[#666] text-[10px] mb-6 text-center leading-tight">
                엑셀 파일 등을 CSV로 저장한 후 업로드하세요.
              </p>
              <div className="relative mt-auto">
                <input 
                  type="file" 
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                />
                <button className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-red/20 text-brand-red border border-brand-red/50 rounded-lg font-bold text-xs tracking-widest hover:bg-brand-red hover:text-black transition-all disabled:opacity-50">
                  <Upload className="w-4 h-4" />
                  파일 선택
                </button>
              </div>
            </div>

            {/* Method 2: Manual Text Input */}
            <div className="flex flex-col items-center p-6 bg-[#111] rounded-xl border border-[#333]">
              <h3 className="text-sm font-bold text-white mb-4">방법 2. 텍스트 직접 입력</h3>
              <textarea 
                value={manualCsvText}
                onChange={e => setManualCsvText(e.target.value)}
                placeholder="[형식 1] 20801,구효진&#10;[형식 2] 2,8,1,김학생"
                className="w-full h-24 bg-[#1A1A1C] p-3 rounded-lg border border-[#444] text-[#DDD] text-xs outline-none focus:border-brand-red resize-none mb-4 font-mono leading-relaxed"
              />
              <button 
                onClick={handleManualSubmit}
                className="w-full py-3 bg-brand-red/20 text-brand-red border border-brand-red/50 hover:bg-brand-red hover:text-black font-bold text-xs rounded-lg transition-colors"
              >
                ✏️ 입력한 텍스트로 등록
              </button>
            </div>
          </div>
          
          {uploadStatus && (
            <div className="mt-8 text-center px-4 py-4 bg-[#1A1A1C] border border-brand-green/30 text-brand-green text-sm rounded-lg shadow-lg">
              {uploadStatus}
            </div>
          )}
        </div>

        
        <div className="glass-card p-10 rounded-2xl border border-brand-green/30 flex flex-col items-center w-full">
          <div className="flex items-center gap-3 mb-6 w-full justify-center">
            <School className="w-6 h-6 text-brand-green" />
            <h2 className="text-xl font-bold tracking-widest text-white">학교명 설정</h2>
          </div>
          <p className="text-[#888] text-xs tracking-wider mb-8 text-center">
            메인 화면에 표시될 우리 학교의 이름을 설정합니다.
          </p>
          
          <div className="w-full flex gap-3 mb-4">
            <input 
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="예: 사직여자고등학교"
              className="flex-1 bg-[#1A1A1C] p-4 rounded-xl border border-[#333] text-white outline-none focus:border-brand-green transition-colors text-sm"
            />
            <button 
              onClick={saveSchoolName}
              className="px-8 bg-brand-green text-black rounded-xl font-black text-sm tracking-widest hover:brightness-110 transition-all shadow-[0_0_15px_rgba(0,255,136,0.3)]"
            >
              저장
            </button>
          </div>

          {schoolNameStatus && (
            <div className="w-full text-center px-4 py-4 bg-[#1A1A1C] border border-brand-green/30 text-brand-green text-sm rounded-lg shadow-lg">
              {schoolNameStatus}
            </div>
          )}
        </div>

        {/* Class Timetable Management */}
        <div className="glass-card p-10 rounded-2xl border border-brand-green/30 flex flex-col items-center w-full mb-12">
          <div className="flex items-center gap-3 mb-6 w-full justify-center">
            <Calendar className="w-6 h-6 text-brand-green" />
            <h2 className="text-xl font-bold tracking-widest text-white">각 반 시간표 직접 입력</h2>
          </div>
          <p className="text-[#888] text-xs tracking-wider mb-8 text-center">
            이 곳에 입력한 시간표가 교실 TV에 최우선으로 반영됩니다. 비워두면 나이스(NEIS) 데이터를 가져옵니다.
          </p>

          <div className="flex items-center gap-4 w-full max-w-md mb-8">
            <div className="flex-1">
              <label className="text-[10px] uppercase text-[#777] font-bold mb-2 block tracking-wider">학년</label>
              <select 
                value={ttGrade}
                onChange={e => setTtGrade(e.target.value)}
                className="w-full bg-[#1A1A1C] p-3 rounded-lg border border-[#444] text-white focus:border-brand-green outline-none transition-colors"
              >
                {availableGrades.map(g => <option key={g} value={g}>{g}학년</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[10px] uppercase text-[#777] font-bold mb-2 block tracking-wider">반</label>
              <select 
                value={ttClassNm}
                onChange={e => setTtClassNm(e.target.value)}
                className="w-full bg-[#1A1A1C] p-3 rounded-lg border border-[#444] text-white focus:border-brand-green outline-none transition-colors"
              >
                {availableClasses.map(c => <option key={c} value={c}>{c}반</option>)}
              </select>
            </div>
          </div>

          
          <div className="w-full max-w-md bg-[#111] p-6 rounded-xl border border-[#333] mb-8">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-brand-green" /> 
              시간표 이미지 등록 (우선 적용)
            </h3>
            <p className="text-[#888] text-[10px] mb-4">
              이미지를 등록하면 아래의 텍스트 시간표나 나이스(NEIS) 시간표 대신 이미지가 교실에 출력됩니다.
            </p>
            
            <div className="flex flex-col gap-4">
              {imageFile ? (
                <div className="relative w-full aspect-video bg-black rounded-lg border border-[#444] overflow-hidden group">
                  <img src={imageFile} alt="시간표 미리보기" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <button 
                      onClick={() => setImageFile(null)}
                      className="flex items-center gap-2 bg-brand-red text-black px-4 py-2 rounded-lg font-bold text-xs"
                    >
                      <Trash2 className="w-4 h-4" />
                      삭제하기
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-32 border-2 border-dashed border-[#444] rounded-lg hover:border-brand-green transition-colors flex flex-col items-center justify-center cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <ImageIcon className="w-8 h-8 text-[#555] mb-2" />
                  <span className="text-[#888] text-xs font-bold">클릭하여 이미지 파일 선택</span>
                </div>
              )}
              
              <button 
                onClick={handleSaveImageTimetable}
                className="w-full bg-[#1A1A1C] text-brand-green border border-brand-green/50 py-3 rounded-lg font-bold text-xs tracking-widest hover:bg-brand-green hover:text-black transition-colors mt-2"
              >
                이미지 설정 저장/적용
              </button>
            </div>
          </div>

          <div className="w-full max-w-md mb-8">
            <div className="relative w-full">
              <input 
                type="file" 
                accept="image/*"
                onChange={handleTtAiExtraction}
                disabled={isExtractingTt}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
              />
              <button className="w-full flex items-center justify-center gap-2 py-4 bg-brand-green/20 text-brand-green border border-brand-green/50 hover:bg-brand-green hover:text-black font-bold text-sm tracking-widest rounded-xl transition-all disabled:opacity-50">
                {isExtractingTt ? <span className="animate-pulse">분석 중...</span> : <><Wand2 className="w-5 h-5"/> 시간표 이미지 첨부 및 OCR 추출</>}
              </button>
            </div>
          </div>

          <div className="w-full overflow-x-auto scrollbar-hide">
            {/* 시원한 넓은 레이아웃으로 변경 (최소 너비를 확보하여 모바일에서도 깨지지 않고 스와이프 가능) */}
            <div className="min-w-[800px] mb-8 w-full">
              <div className="grid grid-cols-6 gap-3 mb-3">
                <div className="text-center text-[#555] font-bold text-xs self-center">교시</div>
                {['월요일', '화요일', '수요일', '목요일', '금요일'].map((d, i) => (
                  <div key={i} className="text-center text-white font-bold text-sm bg-[#222] py-3 rounded-xl shadow-inner">{d}</div>
                ))}
              </div>
              
              {Array.from({length: 7}).map((_, pIdx) => (
                <div key={pIdx} className="grid grid-cols-6 gap-3 mb-3 items-stretch">
                  <div className="text-center text-brand-green font-bold text-sm self-center bg-brand-green/10 py-3 rounded-xl border border-brand-green/20">
                    {pIdx + 1}교시
                  </div>
                  {[1, 2, 3, 4, 5].map((d) => (
                    <TimetableCell
                      key={d}
                      value={localTimetable[d.toString()]?.[pIdx] || ''}
                      onChange={(val) => handleTimetableChange(d.toString(), pIdx, val)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={handleSaveTimetable}
            className="w-full max-w-md bg-brand-green text-black py-4 rounded-xl font-black text-sm tracking-widest hover:brightness-110 transition-all shadow-[0_0_15px_rgba(0,255,136,0.3)]"
          >
            선택 학급 시간표 저장
          </button>
          
          {ttStatus && (
            <div className="mt-6 w-full max-w-md text-center px-4 py-4 bg-[#1A1A1C] border border-brand-green/30 text-brand-green text-sm rounded-lg shadow-lg">
              {ttStatus}
            </div>
          )}
        </div>

        
        {/* 교사 시간표 자동 매핑 */}
        <div className="glass-card p-10 rounded-2xl border border-purple-500/30 flex flex-col items-center w-full mb-12">
          <div className="flex items-center gap-3 mb-6 w-full justify-center">
            <School className="w-6 h-6 text-purple-500" />
            <h2 className="text-xl font-bold tracking-widest text-white">교사 시간표 자동 매핑 (Vision AI)</h2>
          </div>
          <p className="text-[#888] text-xs tracking-wider mb-8 text-center">
            학교 전체 또는 반 시간표 이미지를 업로드하면 AI가 분석하여<br/>
            등록된 선생님들의 개별 시간표에 자동으로 매핑해 줍니다.
          </p>

          <div className="w-full max-w-xl mx-auto flex flex-col items-center">
            <div className="relative w-full h-24 mb-4 border-2 border-dashed border-[#444] hover:border-purple-500 rounded-xl bg-[#111] transition-colors flex items-center justify-center cursor-pointer group">
              <input 
                type="file" 
                accept="image/png, image/jpeg" 
                onChange={handleExtractTeacherSchedule}
                disabled={isExtractingTeacher}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
              />
              <div className="flex flex-col items-center gap-2 text-[#666] group-hover:text-purple-500 transition-colors">
                {isExtractingTeacher ? (
                  <span className="animate-pulse flex items-center gap-2 font-bold"><Wand2 className="w-5 h-5 animate-spin"/> AI 분석 중...</span>
                ) : (
                  <>
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-xs font-bold tracking-widest">시간표 이미지 첨부 (.png, .jpg)</span>
                  </>
                )}
              </div>
            </div>
            {teacherTtStatus && (
              <div className="w-full text-center px-4 py-3 bg-[#1A1A1C] border border-purple-500/30 text-purple-400 text-sm rounded-lg shadow-lg">
                {teacherTtStatus}
              </div>
            )}
          </div>
        </div>

        {/* Meal Management */}
        <div className="glass-card p-10 rounded-2xl border border-yellow-500/30 flex flex-col items-center w-full mb-12">
          <div className="flex items-center gap-3 mb-4 w-full justify-center">
            <Utensils className="w-6 h-6 text-yellow-500" />
            <h2 className="text-xl font-bold tracking-widest text-white">오늘 및 월간 급식 관리 (Vision AI)</h2>
          </div>
          <p className="text-[#888] text-xs tracking-wider mb-8 text-center leading-relaxed">
            한 달 치 식단표 이미지(그림, 사진, PDF 등)를 첨부하면 AI가 <span className="text-yellow-400 font-bold">모든 날짜의 점심/저녁 메뉴</span>를 한 번에 추출합니다.<br/>
            추출된 목록을 확인 및 수정한 후 일괄 저장하면 교실 화면에 나이스(NEIS) 데이터보다 우선 표시됩니다.
          </p>

          {/* Top Upload & URL Extraction Controls */}
          <div className="flex flex-col gap-4 w-full mb-8">
            <div className="flex flex-col md:flex-row gap-4 w-full">
              <div className="relative flex-1">
                <input 
                  type="file" 
                  accept="image/*,application/pdf"
                  onChange={handleMealImageUpload}
                  disabled={isExtractingMeal}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                />
                <button className="w-full flex items-center justify-center gap-2 py-4 bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 hover:bg-yellow-500 hover:text-black font-bold text-sm tracking-widest rounded-xl transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(234,179,8,0.15)]">
                  {isExtractingMeal ? (
                    <span className="animate-pulse flex items-center gap-2">
                      <Wand2 className="w-5 h-5 animate-spin"/> 한 달 치 식단 전체 분석 중...
                    </span>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5"/> 월간 식단표 이미지/PDF 첨부 및 전체 날짜 추출
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 w-full">
              <div className="flex-1 flex gap-2">
                <input 
                  type="text" 
                  placeholder="학교 홈페이지 급식 게시판 링크(URL) 입력" 
                  value={mealUrl}
                  onChange={(e) => setMealUrl(e.target.value)}
                  className="w-full bg-black/40 p-3 rounded-xl border border-yellow-500/30 text-white outline-none focus:border-yellow-500 transition-colors text-sm"
                />
                <button 
                  onClick={handleMealUrlExtraction} 
                  disabled={isExtractingUrl} 
                  className="flex items-center justify-center gap-2 px-6 bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 hover:bg-yellow-500 hover:text-black font-bold text-xs tracking-widest rounded-xl transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  {isExtractingUrl ? <span className="animate-pulse">분석 중...</span> : <><Wand2 className="w-4 h-4"/> 링크 추출</>}
                </button>
              </div>
            </div>
          </div>

          {mealStatus && (
            <div className="mb-8 w-full text-center px-4 py-4 bg-[#1A1A1C] border border-yellow-500/30 text-yellow-400 text-sm rounded-lg shadow-lg">
              {mealStatus}
            </div>
          )}

          {/* Section: Extracted Meals List View (Monthly Review) */}
          {extractedMeals.length > 0 ? (
            <div className="w-full bg-[#111113] p-6 rounded-2xl border border-yellow-500/40 flex flex-col gap-6 mb-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#333] pb-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-yellow-500 text-black text-xs font-black rounded-full uppercase tracking-wider">
                    AI 추출 완료
                  </span>
                  <h3 className="text-lg font-bold text-white">
                    추출된 식단 목록 <span className="text-yellow-400">({extractedMeals.length}일치)</span>
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <button
                    onClick={handleAddExtractedMealRow}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#222] hover:bg-[#333] text-gray-200 border border-[#444] rounded-lg text-xs font-bold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-yellow-400" /> 날짜 추가
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("추출된 식단 목록을 모두 비우시겠습니까?")) {
                        setExtractedMeals([]);
                      }
                    }}
                    className="px-3 py-2 bg-[#222] hover:bg-[#333] text-gray-400 hover:text-red-400 border border-[#444] rounded-lg text-xs font-bold transition-colors"
                  >
                    목록 비우기
                  </button>
                  <button
                    onClick={handleSaveAllExtractedMeals}
                    disabled={isSavingBulkMeals}
                    className="flex items-center gap-2 px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(234,179,8,0.3)] disabled:opacity-50"
                  >
                    {isSavingBulkMeals ? (
                      <span className="animate-pulse">저장 중...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> 전체 식단 일괄 Firebase 저장 ({extractedMeals.length}일치)
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Filter / Search bar */}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="날짜(예: 202608) 또는 메뉴 검색 필터..."
                  value={mealFilterKeyword}
                  onChange={(e) => setMealFilterKeyword(e.target.value)}
                  className="w-full max-w-xs bg-[#1A1A1C] px-3 py-2 rounded-lg border border-[#444] text-xs text-white outline-none focus:border-yellow-500 transition-colors"
                />
                {mealFilterKeyword && (
                  <button
                    onClick={() => setMealFilterKeyword('')}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    초기화
                  </button>
                )}
              </div>

              {/* List of Extracted Meals */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-1">
                {extractedMeals
                  .filter((m) => {
                    if (!mealFilterKeyword.trim()) return true;
                    const kw = mealFilterKeyword.toLowerCase();
                    return (
                      m.date.includes(kw) ||
                      m.lunch.some((l) => l.toLowerCase().includes(kw)) ||
                      m.dinner.some((d) => d.toLowerCase().includes(kw))
                    );
                  })
                  .map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-[#18181B] p-4 rounded-xl border border-[#333] hover:border-yellow-500/40 flex flex-col gap-3 transition-colors"
                    >
                      <div className="flex items-center justify-between border-b border-[#2A2A2E] pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                            {formatDateWithDay(item.date)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item.date}
                            onChange={(e) => handleExtractedMealDateChange(idx, e.target.value)}
                            className="w-24 bg-[#111] px-2 py-1 rounded text-center text-xs font-mono border border-[#444] text-gray-200 outline-none focus:border-yellow-500"
                            placeholder="YYYYMMDD"
                            title="날짜 수정 (YYYYMMDD)"
                          />
                          <button
                            onClick={() => handleRemoveExtractedMeal(idx)}
                            className="p-1 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded transition-colors"
                            title="해당 날짜 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Lunch input */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[11px] font-bold text-yellow-400">
                          <span>점심(중식)</span>
                          <span className="text-[10px] text-gray-400 font-normal">
                            {item.lunch.length}개 메뉴
                          </span>
                        </div>
                        <textarea
                          rows={3}
                          value={item.lunch.join('\n')}
                          onChange={(e) => handleExtractedMealMenuChange(idx, 'lunch', e.target.value)}
                          placeholder="점심 메뉴 (엔터 구분)"
                          className="w-full bg-[#121214] p-2.5 rounded-lg border border-[#3A3A3E] text-white outline-none focus:border-yellow-500 text-xs font-sans resize-none leading-relaxed"
                        />
                      </div>

                      {/* Dinner input */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[11px] font-bold text-gray-300">
                          <span>저녁(석식)</span>
                          <span className="text-[10px] text-gray-400 font-normal">
                            {item.dinner.length > 0 ? `${item.dinner.length}개 메뉴` : '없음'}
                          </span>
                        </div>
                        <textarea
                          rows={2}
                          value={item.dinner.join('\n')}
                          onChange={(e) => handleExtractedMealMenuChange(idx, 'dinner', e.target.value)}
                          placeholder="저녁 메뉴 (선택사항)"
                          className="w-full bg-[#121214] p-2 rounded-lg border border-[#3A3A3E] text-gray-200 outline-none focus:border-yellow-500 text-xs font-sans resize-none leading-relaxed"
                        />
                      </div>

                      <div className="mt-auto pt-2 flex justify-end">
                        <button
                          onClick={() => handleSaveSingleExtractedMeal(item)}
                          className="px-3 py-1 bg-yellow-500/10 hover:bg-yellow-500 hover:text-black text-yellow-400 border border-yellow-500/30 rounded text-[10px] font-bold transition-colors"
                        >
                          이 날짜만 저장
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Bottom Batch Save Button */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleSaveAllExtractedMeals}
                  disabled={isSavingBulkMeals}
                  className="w-full max-w-md py-4 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-black text-sm tracking-widest transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSavingBulkMeals ? (
                    <span className="animate-pulse">Firebase 일괄 저장 중...</span>
                  ) : (
                    <>
                      <Check className="w-5 h-5" /> 추출된 전체 식단 일괄 Firebase 저장 ({extractedMeals.length}일치)
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full bg-[#141416] p-6 rounded-xl border border-[#333] mb-8 text-center text-gray-400 text-xs leading-relaxed">
              💡 <span className="text-yellow-400 font-bold">월간 식단표 이미지 첨부</span>를 누르면, AI가 한 달 치 모든 날짜의 메뉴를 자동 분석하여 목록으로 표시합니다.
            </div>
          )}

          {/* Section: Single Date Direct Manual Editor */}
          <div className="w-full bg-[#141416] p-6 rounded-xl border border-[#333] flex flex-col gap-6 mb-6">
            <div className="flex items-center justify-between border-b border-[#2A2A2E] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-yellow-500" />
                개별 날짜 직접 확인 및 수정
              </h3>
              <div className="flex items-center gap-2">
                <label className="text-[10px] uppercase text-[#777] font-bold tracking-wider">적용 날짜</label>
                <input 
                  type="text"
                  value={mealDate}
                  onChange={(e) => setMealDate(e.target.value)}
                  className="w-32 bg-[#1A1A1C] p-2 rounded-lg border border-[#444] text-white outline-none focus:border-yellow-500 transition-colors text-center text-xs font-mono"
                  placeholder="YYYYMMDD"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-yellow-500 flex justify-between">
                  점심 메뉴
                  <span className="text-[10px] text-[#666] font-normal">엔터로 구분</span>
                </label>
                <textarea
                  value={localMeal.lunch}
                  onChange={e => setLocalMeal({...localMeal, lunch: e.target.value})}
                  className="w-full h-32 bg-[#1A1A1C] p-3 rounded-xl border border-[#333] text-white outline-none focus:border-yellow-500 resize-none font-medium text-sm leading-relaxed"
                  placeholder="예:&#10;현미밥&#10;김치찌개&#10;돈까스"
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-300 flex justify-between">
                  저녁 메뉴
                  <span className="text-[10px] text-[#666] font-normal">엔터로 구분</span>
                </label>
                <textarea
                  value={localMeal.dinner}
                  onChange={e => setLocalMeal({...localMeal, dinner: e.target.value})}
                  className="w-full h-32 bg-[#1A1A1C] p-3 rounded-xl border border-[#333] text-white outline-none focus:border-yellow-500 resize-none font-medium text-sm leading-relaxed"
                  placeholder="선택사항 (석식이 없으면 비워둠)"
                />
              </div>
            </div>

            <button 
              onClick={handleSaveMeal}
              className="w-full py-3 bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 hover:bg-yellow-500 hover:text-black font-bold text-xs tracking-wider rounded-lg transition-colors"
            >
              선택한 날짜 ({formatDateWithDay(mealDate)}) 급식 저장 및 교실 적용
            </button>
          </div>

          {/* Section: Firebase Saved Meals Explorer */}
          <div className="w-full bg-[#111] rounded-xl border border-[#333] overflow-hidden">
            <button
              onClick={() => setShowSavedMealsList(!showSavedMealsList)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-[#1A1A1C] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-yellow-500" />
                <span className="text-xs font-bold text-white">
                  현재 서버(Firebase)에 등록된 식단 데이터
                </span>
                <span className="px-2 py-0.5 bg-[#222] text-yellow-400 text-[10px] font-bold rounded-full">
                  총 {Object.keys(allMeals || {}).length}일치
                </span>
              </div>
              {showSavedMealsList ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {showSavedMealsList && (
              <div className="p-4 border-t border-[#222] bg-[#0E0E10] flex flex-col gap-4">
                {Object.keys(allMeals || {}).length > 0 ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-gray-400">
                        서버에 저장된 날짜별 식단 목록입니다.
                      </span>
                      <button
                        onClick={async () => {
                          if (confirm("서버에 등록된 모든 커스텀 식단 데이터를 삭제하시겠습니까? (이후 나이스 데이터가 기본 표시됩니다)")) {
                            await clearAllCustomMeals();
                            setMealStatus("✅ 등록된 모든 커스텀 식단 데이터가 삭제되었습니다.");
                            setTimeout(() => setMealStatus(null), 3000);
                          }
                        }}
                        className="text-[10px] text-red-400 hover:text-red-300 font-bold px-2 py-1 rounded bg-red-500/10 border border-red-500/20"
                      >
                        전체 삭제
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                      {Object.keys(allMeals)
                        .sort()
                        .map((dt) => {
                          const item = allMeals[dt];
                          return (
                            <div
                              key={dt}
                              className="p-3 bg-[#18181A] rounded-lg border border-[#333] flex flex-col gap-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-yellow-400">
                                  {formatDateWithDay(dt)}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      setMealDate(dt);
                                      setLocalMeal({
                                        lunch: item.lunch?.join('\n') || '',
                                        dinner: item.dinner?.join('\n') || ''
                                      });
                                    }}
                                    className="px-2 py-0.5 bg-[#2A2A2E] text-gray-300 hover:text-white rounded text-[10px]"
                                  >
                                    수정
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (confirm(`${dt} 식단을 삭제하시겠습니까?`)) {
                                        await deleteCustomMeal(dt);
                                      }
                                    }}
                                    className="p-1 text-gray-500 hover:text-red-400 rounded"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              <div className="text-[11px] text-gray-300 line-clamp-2">
                                <span className="text-yellow-500/80 font-bold mr-1">[중식]</span>
                                {item.lunch && item.lunch.length > 0
                                  ? item.lunch.join(', ')
                                  : '등록된 메뉴 없음'}
                              </div>
                              {item.dinner && item.dinner.length > 0 && (
                                <div className="text-[11px] text-gray-400 line-clamp-1">
                                  <span className="text-gray-500 font-bold mr-1">[석식]</span>
                                  {item.dinner.join(', ')}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </>
                ) : (
                  <p className="text-center text-gray-500 text-xs py-4">
                    현재 Firebase 서버에 저장된 식단 데이터가 없습니다. (나이스 NEIS 급식 표시 중)
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="glass-card p-10 rounded-2xl border border-brand-blue/30 flex flex-col items-center w-full">
          <div className="flex items-center gap-3 mb-6 w-full justify-center">
            <Clock className="w-6 h-6 text-brand-blue" />
            <h2 className="text-xl font-bold tracking-widest text-white">학교 일과시간 설정</h2>
          </div>
          <p className="text-[#888] text-xs tracking-wider mb-8 text-center">
            설정된 시간 동안에는 교실 칠판에 호출 알림이 울리지 않습니다. (방해금지 모드)
          </p>
          
          <div className="w-full space-y-3 mb-8">
            {schedule.map((slot, idx) => (
              <div key={idx} className="flex items-center justify-between gap-4 p-3 bg-[#111] rounded-xl border border-[#333]">
                <div className="font-bold text-brand-blue w-16">{slot.period}교시</div>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={slot.start}
                    onChange={(e) => handleScheduleChange(idx, 'start', e.target.value)}
                    className="flex-1 bg-[#1A1A1C] p-2 rounded-lg border border-[#444] text-white outline-none focus:border-brand-blue text-center text-sm"
                  />
                  <span className="text-[#555]">~</span>
                  <input
                    type="time"
                    value={slot.end}
                    onChange={(e) => handleScheduleChange(idx, 'end', e.target.value)}
                    className="flex-1 bg-[#1A1A1C] p-2 rounded-lg border border-[#444] text-white outline-none focus:border-brand-blue text-center text-sm"
                  />
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={saveSchedule}
            className="w-full bg-brand-blue text-black py-4 rounded-xl font-black text-sm tracking-widest hover:brightness-110 transition-all shadow-[0_0_15px_rgba(0,195,255,0.3)]"
          >
            일과표 저장
          </button>
          
          {scheduleStatus && (
            <div className="mt-6 w-full text-center px-4 py-4 bg-[#1A1A1C] border border-brand-green/30 text-brand-green text-sm rounded-lg shadow-lg">
              {scheduleStatus}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
