import React, { useRef, useState, useEffect } from 'react';
import { ref, set, onValue } from 'firebase/database';
import { db } from '../lib/firebase';
import { setGlobalStudents } from '../lib/store';
import { Upload, Home, Clock, School } from 'lucide-react';
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
