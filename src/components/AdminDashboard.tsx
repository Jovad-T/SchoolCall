import React, { useRef, useState, useEffect } from 'react';
import { ref, set, onValue } from 'firebase/database';
import { db } from '../lib/firebase';
import { setGlobalStudents, useSchoolStructure, useClassTimetable, useClassTimetableImage, useCustomMeal } from '../lib/store';
import { Upload, Home, Clock, School, Calendar, Image as ImageIcon, Trash2, Utensils, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

  const { customMeal, updateCustomMeal } = useCustomMeal();
  const [isExtractingMeal, setIsExtractingMeal] = useState(false);
  const [mealDate, setMealDate] = useState(new Date().toISOString().split('T')[0].replace(/-/g, ''));
  const [mealStatus, setMealStatus] = useState<string | null>(null);
  const [localMeal, setLocalMeal] = useState<{lunch: string, dinner: string}>({lunch: '', dinner: ''});

  useEffect(() => {
    if (customMeal && customMeal.date === mealDate) {
      setLocalMeal({
        lunch: customMeal.lunch.join('\n'),
        dinner: customMeal.dinner.join('\n')
      });
    } else {
      setLocalMeal({lunch: '', dinner: ''});
    }
  }, [customMeal, mealDate]);

  const handleMealImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert("파일 크기는 4MB 이하여야 합니다.");
      return;
    }

    setIsExtractingMeal(true);
    setMealStatus("AI가 메뉴를 분석하고 있습니다...");

    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      const base64 = result.split(',')[1];
      const mimeType = file.type;

      try {
        let data;
        // Electron 앱인지 Web 환경인지 확인 후 분기
        if (typeof window !== 'undefined' && (window as any).electron?.invoke) {
          data = await (window as any).electron.invoke('extract-meal', { base64, mimeType });
        } else {
          const res = await fetch('/api/extract-meal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64, mimeType })
          });
          if (!res.ok) throw new Error("API 요청 실패");
          data = await res.json();
        }

        if (data) {
          setLocalMeal({
            lunch: data.lunch?.join('\n') || '',
            dinner: data.dinner?.join('\n') || ''
          });
          setMealStatus("✅ 분석이 완료되었습니다. 내역을 확인하고 저장해주세요.");
        }
      } catch (err) {
        console.error("Meal extraction error:", err);
        setMealStatus("❌ 분석 중 오류가 발생했습니다.");
      } finally {
        setIsExtractingMeal(false);
        setTimeout(() => setMealStatus(null), 5000);
      }
    };
    reader.readAsDataURL(file);
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
      setMealStatus("✅ 급식 정보가 성공적으로 저장되었습니다. (교실 화면에 우선 적용됩니다)");
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

      <div className="max-w-xl w-full text-center space-y-12">
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

          <div className="w-full overflow-x-auto custom-scrollbar">

            <div className="min-w-[600px] mb-8">
              <div className="grid grid-cols-6 gap-2 mb-2">
                <div className="text-center text-[#555] font-bold text-xs">교시</div>
                {['월', '화', '수', '목', '금'].map((d, i) => (
                  <div key={i} className="text-center text-white font-bold text-sm bg-[#222] py-2 rounded-lg">{d}</div>
                ))}
              </div>
              
              {Array.from({length: 7}).map((_, pIdx) => (
                <div key={pIdx} className="grid grid-cols-6 gap-2 mb-2 items-center">
                  <div className="text-center text-brand-green font-bold text-xs">{pIdx + 1}교시</div>
                  {[1, 2, 3, 4, 5].map((d) => (
                    <input
                      key={d}
                      type="text"
                      value={localTimetable[d.toString()]?.[pIdx] || ''}
                      onChange={(e) => handleTimetableChange(d.toString(), pIdx, e.target.value)}
                      className="w-full bg-[#1A1A1C] p-2 rounded-lg border border-[#444] text-white outline-none focus:border-brand-green text-center text-sm"
                      placeholder="과목명"
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

        {/* Meal Management */}
        <div className="glass-card p-10 rounded-2xl border border-yellow-500/30 flex flex-col items-center w-full mb-12">
          <div className="flex items-center gap-3 mb-6 w-full justify-center">
            <Utensils className="w-6 h-6 text-yellow-500" />
            <h2 className="text-xl font-bold tracking-widest text-white">오늘의 급식 직접/자동 입력</h2>
          </div>
          <p className="text-[#888] text-xs tracking-wider mb-8 text-center">
            급식 식단표 이미지(그림, 사진 등)를 첨부하면 AI가 메뉴를 자동으로 추출합니다.<br/>
            이 곳에 저장된 식단이 나이스(NEIS) 데이터보다 교실에 우선적으로 표시됩니다.
          </p>

          <div className="w-full flex gap-3 mb-8 items-center justify-center">
            <label className="text-[10px] uppercase text-[#777] font-bold tracking-wider">적용 날짜 (YYYYMMDD)</label>
            <input 
              type="text"
              value={mealDate}
              onChange={(e) => setMealDate(e.target.value)}
              className="w-40 bg-[#1A1A1C] p-3 rounded-xl border border-[#333] text-white outline-none focus:border-yellow-500 transition-colors text-center text-sm font-mono"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-8">
            <div className="flex flex-col gap-3">
              <label className="text-sm font-bold text-yellow-500 flex justify-between">
                점심 메뉴
                <span className="text-[10px] text-[#666] font-normal">엔터로 구분</span>
              </label>
              <textarea
                value={localMeal.lunch}
                onChange={e => setLocalMeal({...localMeal, lunch: e.target.value})}
                className="w-full h-40 bg-[#1A1A1C] p-4 rounded-xl border border-[#333] text-white outline-none focus:border-yellow-500 resize-none font-bold text-lg"
                placeholder="예:&#10;현미밥&#10;김치찌개&#10;돈까스"
              />
            </div>
            
            <div className="flex flex-col gap-3">
              <label className="text-sm font-bold text-yellow-500 flex justify-between">
                저녁 메뉴
                <span className="text-[10px] text-[#666] font-normal">엔터로 구분</span>
              </label>
              <textarea
                value={localMeal.dinner}
                onChange={e => setLocalMeal({...localMeal, dinner: e.target.value})}
                className="w-full h-40 bg-[#1A1A1C] p-4 rounded-xl border border-[#333] text-white outline-none focus:border-yellow-500 resize-none font-bold text-lg"
                placeholder="선택사항"
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 w-full">
            <div className="relative flex-1">
              <input 
                type="file" 
                accept="image/*,application/pdf"
                onChange={handleMealImageUpload}
                disabled={isExtractingMeal}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
              />
              <button className="w-full flex items-center justify-center gap-2 py-4 bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 hover:bg-yellow-500 hover:text-black font-bold text-sm tracking-widest rounded-xl transition-all disabled:opacity-50">
                {isExtractingMeal ? <span className="animate-pulse">분석 중...</span> : <><Wand2 className="w-5 h-5"/> 식단표 첨부 및 AI 자동 추출</>}
              </button>
            </div>
            
            <button 
              onClick={handleSaveMeal}
              className="flex-1 bg-yellow-500 text-black py-4 rounded-xl font-black text-sm tracking-widest hover:brightness-110 transition-all shadow-[0_0_15px_rgba(234,179,8,0.3)]"
            >
              급식 메뉴 저장 / 적용
            </button>
          </div>

          {mealStatus && (
            <div className="mt-6 w-full text-center px-4 py-4 bg-[#1A1A1C] border border-yellow-500/30 text-yellow-500 text-sm rounded-lg shadow-lg">
              {mealStatus}
            </div>
          )}
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
