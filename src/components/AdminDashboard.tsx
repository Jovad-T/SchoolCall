import React, { useRef, useState, useEffect } from 'react';
import { ref, set, onValue } from 'firebase/database';
import { db } from '../lib/firebase';
import { Upload, Home, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [schedule, setSchedule] = useState<{period: number; start: string; end: string}[]>(
    Array.from({length: 7}, (_, i) => ({ period: i + 1, start: '', end: '' }))
  );
  const [scheduleStatus, setScheduleStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;
    const scheduleRef = ref(db, 'school_data/schedule');
    const unsub = onValue(scheduleRef, (snapshot) => {
      if (snapshot.exists()) {
        setSchedule(snapshot.val());
      }
    });
    return () => unsub();
  }, []);

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


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        const groupedData: Record<string, Record<string, string[]>> = {};
        let studentCount = 0;

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          
          const parts = trimmed.split(',');
          if (parts.length >= 4) {
            const [g, c, num, name] = parts.map(p => p.trim());
            
            // 헤더 건너뛰기
            if (g === '학년' || isNaN(Number(g))) continue;
            
            if (!groupedData[g]) {
              groupedData[g] = {};
            }
            if (!groupedData[g][c]) {
              groupedData[g][c] = [];
            }
            
            groupedData[g][c].push(`${num}번 ${name}`);
            studentCount++;
          }
        }

        if (Object.keys(groupedData).length > 0 && db) {
          await set(ref(db, 'school_data/students'), groupedData);
          setUploadStatus(`✅ 마스터 데이터 갱신 완료: 총 ${studentCount}명의 학생 명단이 시스템에 일괄 등록되었습니다.`);
        } else if (!db) {
          alert("Firebase 연결이 필요합니다.");
        } else {
          alert("유효한 CSV 데이터가 없습니다. 형식: '학년,반,번호,이름'");
        }
      } catch (err) {
        console.error(err);
        alert("파일 처리 중 오류가 발생했습니다.");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
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

        <div className="glass-card p-10 rounded-2xl border border-brand-red/30 flex flex-col items-center justify-center">
          <input 
            type="file" 
            accept=".csv"
            ref={fileInputRef}
            onChange={handleFileUpload}
            disabled={isUploading}
            className="block w-full max-w-sm text-sm text-[#AAA]
              file:mr-4 file:py-3 file:px-6
              file:rounded-full file:border-0
              file:text-sm file:font-bold file:tracking-widest
              file:bg-brand-red file:text-black
              hover:file:brightness-110 hover:file:cursor-pointer
              transition-all disabled:opacity-50"
          />
          
          {uploadStatus && (
            <div className="mt-6 text-center px-4 py-4 bg-[#1A1A1C] border border-brand-green/30 text-brand-green text-sm rounded-lg shadow-lg">
              {uploadStatus}
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
