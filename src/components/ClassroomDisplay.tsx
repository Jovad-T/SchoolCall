import { useState, useEffect, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../lib/firebase';
import { useCallState, CallState } from '../lib/store';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Utensils, Megaphone, Calendar, Settings, CheckCircle, User, MapPin } from 'lucide-react';
import clsx from 'clsx';

const DUMMY_TIMETABLE = [
  { period: 1, subject: "국어", time: "09:00 - 09:45" },
  { period: 2, subject: "수학", time: "09:55 - 10:40" },
  { period: 3, subject: "체육", time: "10:50 - 11:35" },
  { period: 4, subject: "영어", time: "11:45 - 12:30" },
  { period: 5, subject: "점심시간", time: "12:30 - 13:30", isBreak: true },
  { period: 6, subject: "과학", time: "13:30 - 14:15" },
  { period: 7, subject: "음악", time: "14:25 - 15:10" },
];

const DUMMY_LUNCH = "현미밥\n쇠고기미역국\n매콤돼지갈비찜\n계란말이\n배추김치\n초코우유";

const alertSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

export default function ClassroomDisplay() {

  // Settings State
  const [settings, setSettings] = useState<{grade: string; classNm: string} | null>(null);
  
  const classId = settings ? `${settings.grade}-${settings.classNm}` : '';
  const { state, updateState } = useCallState(classId);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempSettings, setTempSettings] = useState({
    grade: '2',
    classNm: '8'
  });

  // Data State
  const [timetable, setTimetable] = useState<string[]>([]);
  const [lunch, setLunch] = useState<string[]>([]);
  const [isLoadingNeis, setIsLoadingNeis] = useState(false);
  const [neisError, setNeisError] = useState(false);

  const [schedule, setSchedule] = useState<{period: number; start: string; end: string}[]>([]);
  const [pendingCalls, setPendingCalls] = useState<CallState[]>([]);
  const [activeAlert, setActiveAlert] = useState<CallState | null>(null);

  const [timeLeft, setTimeLeft] = useState<number>(30);

  useEffect(() => {
    if (activeAlert) {
      setTimeLeft(30);
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [activeAlert]);

  useEffect(() => {
    if (activeAlert && timeLeft === 0) {
      handleDismissAlert();
    }
  }, [timeLeft, activeAlert]);

  
  useEffect(() => {
    if (db) {
      const scheduleRef = ref(db, 'school_data/schedule');
      const unsub = onValue(scheduleRef, (snapshot) => {
        if (snapshot.exists()) {
          setSchedule(snapshot.val());
        }
      });
      return () => unsub();
    }
  }, []);

  const checkIsClassTime = (time: Date) => {
    const currentTotal = time.getHours() * 60 + time.getMinutes();
    for (const slot of schedule) {
      if (!slot.start || !slot.end) continue;
      const [sH, sM] = slot.start.split(':').map(Number);
      const [eH, eM] = slot.end.split(':').map(Number);
      const sTotal = sH * 60 + sM;
      const eTotal = eH * 60 + eM;
      if (currentTotal >= sTotal && currentTotal <= eTotal) {
        return true;
      }
    }
    return false;
  };

  const inClass = checkIsClassTime(currentTime);
  const wasInClassRef = useRef(false);
  const prevCallStatus = useRef(false);

  // [시간 전환 감지 및 큐 방출 로직]
  useEffect(() => {
    const currentlyInClass = checkIsClassTime(currentTime);
    
    // 직전까지 수업 중(true)이다가 방금 막 쉬는 시간(false)으로 바뀌었다면
    if (wasInClassRef.current === true && currentlyInClass === false) {
      if (pendingCalls.length > 0) {
        console.log("쉬는 시간이 되어 대기열의 알림을 표시합니다.");
        const latestCall = pendingCalls[pendingCalls.length - 1];
        setActiveAlert(latestCall);
        setPendingCalls([]); // 대기열 초기화
      }
    }
    
    // 현재 상태로 갱신
    wasInClassRef.current = currentlyInClass;
  }, [currentTime, pendingCalls, schedule]); // currentTime 변경마다 체크

  // [호출 알림 인터셉트 로직]
  useEffect(() => {
    if (state.callStatus && !prevCallStatus.current) {
      if (checkIsClassTime(new Date())) {
        console.log("수업 중이라 알림이 대기열에 추가되었습니다:", state);
        // 함수형 업데이트 필수
        setPendingCalls(prev => [...prev, state]);
      } else {
        setActiveAlert(state);
      }
    }
    
    if (!state.callStatus && prevCallStatus.current) {
       setActiveAlert(null);
    }
    
    prevCallStatus.current = state.callStatus;
  }, [state, schedule]);

  
  // 알림 모달이 표시될 때 알림음 재생
  useEffect(() => {
    if (activeAlert) {
      alertSound.currentTime = 0;
      alertSound.play().catch(err => console.warn("오디오 재생 실패 (Autoplay 차단 등):", err));
      
      if ((window as any).electronAPI && (window as any).electronAPI.showAppWindow) {
        (window as any).electronAPI.showAppWindow();
      }
    }
  }, [activeAlert]);

  const handleDismissAlert = () => {
    setActiveAlert(null);
    updateState({
      callStatus: false,
      studentName: '',
      message: '',
      teacherName: '',
      location: ''
    });
  };


  


  useEffect(() => {
    const savedGrade = localStorage.getItem('display_grade');
    const savedClass = localStorage.getItem('display_class');
    if (savedGrade && savedClass) {
      setSettings({ grade: savedGrade, classNm: savedClass });
      setTempSettings({ grade: savedGrade, classNm: savedClass });
    } else {
      setShowSettingsModal(true);
    }
  }, []);

  useEffect(() => {
    if (!settings || showSettingsModal) return;

    const fetchNeisData = async () => {
      setIsLoadingNeis(true);
      setNeisError(false);

      const d = new Date();
      const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

      try {
        const KEY = 'c9fdeb8328f2452193c8c612a535c484';
        const TYPE = 'json';
        const ATPT_OFCDC_SC_CODE = 'C10';
        const SD_SCHUL_CODE = '7150125';
        const GRADE = settings.grade;
        const CLASS_NM = settings.classNm;

        const [ttRes, lunchRes] = await Promise.all([
          fetch(`https://open.neis.go.kr/hub/hisTimetable?KEY=${KEY}&Type=${TYPE}&ATPT_OFCDC_SC_CODE=${ATPT_OFCDC_SC_CODE}&SD_SCHUL_CODE=${SD_SCHUL_CODE}&GRADE=${GRADE}&CLASS_NM=${CLASS_NM}&ALL_TI_YMD=${ymd}`),
          fetch(`https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=${KEY}&Type=${TYPE}&ATPT_OFCDC_SC_CODE=${ATPT_OFCDC_SC_CODE}&SD_SCHUL_CODE=${SD_SCHUL_CODE}&MLSV_YMD=${ymd}`)
        ]);

        const ttData = await ttRes.json();
        const lunchData = await lunchRes.json();

        // Parse Timetable
        if (ttData.hisTimetable && ttData.hisTimetable[1].row) {
          const rows = ttData.hisTimetable[1].row;
          rows.sort((a: any, b: any) => Number(a.PERIO) - Number(b.PERIO));
          setTimetable(rows.map((r: any) => r.ITRT_CNTNT));
        } else {
          setTimetable([]);
        }

        // Parse Lunch
        if (lunchData.mealServiceDietInfo && lunchData.mealServiceDietInfo[1].row) {
          const rawLunch = lunchData.mealServiceDietInfo[1].row[0].DDISH_NM;
          const cleaned = rawLunch
            .split('<br/>')
            .map((item: string) => item.replace(/[0-9.]/g, '').replace(/[^가-힣a-zA-Z\s]/g, '').trim())
            .filter(Boolean);
          setLunch(cleaned);
        } else {
          setLunch([]);
        }
      } catch (err) {
        console.error("NEIS Fetch Error:", err);
        setNeisError(true);
      } finally {
        setIsLoadingNeis(false);
      }
    };

    fetchNeisData();
  }, [settings, showSettingsModal]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSaveSettings = () => {
    
    // 브라우저 자동재생(Autoplay) 차단 방어 (Unlock)
    alertSound.volume = 0; // 빈 소리로 만들기 위해 볼륨 0
    alertSound.play().then(() => {
      alertSound.pause();
      alertSound.currentTime = 0;
      alertSound.volume = 1; // 다시 정상 볼륨 복구
    }).catch(() => {});

    localStorage.setItem('display_grade', tempSettings.grade);
    localStorage.setItem('display_class', tempSettings.classNm);
    setSettings(tempSettings);
    setShowSettingsModal(false);
  };

  const timeString = currentTime.toLocaleTimeString('ko-KR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  
  const dateString = currentTime.toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'long'
  });

  return (
    <div className="min-h-screen bg-bg-dark text-[#E0E0E0] grid-bg overflow-hidden relative font-sans flex flex-col">

      <style>
        {`
        @keyframes flicker {
          0%, 18%, 22%, 25%, 53%, 57%, 100% {
            opacity: 1;
          }
          20%, 24%, 55% {
            opacity: 0.7;
          }
        }
        `}
      </style>


      
      {inClass && (
        <div className="absolute top-6 right-20 z-40 flex items-center gap-3">
          <div className="px-4 py-2 bg-[#1A1A1C] border border-[#333] rounded-full text-xs font-bold flex items-center gap-2 shadow-lg backdrop-blur text-brand-red">
            <span>🔇 수업 중</span>
            {pendingCalls.length > 0 && (
              <span className="bg-brand-red text-black px-2 py-0.5 rounded-full text-[10px]">
                대기 중인 알림 {pendingCalls.length}건
              </span>
            )}
          </div>
        </div>
      )}

      <button 
        onClick={() => setShowSettingsModal(true)}
        className="absolute top-6 right-6 z-40 p-3 rounded-full bg-neutral-900/50 hover:bg-neutral-800 text-neutral-500 hover:text-brand-green transition-colors backdrop-blur"
      >
        <Settings className="w-6 h-6" />
      </button>

      <AnimatePresence mode="wait">
        {!activeAlert ? (
          <motion.div 
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full h-screen flex flex-col p-12 lg:p-20 relative z-10"
          >
            {/* Header: Date & Time */}
            <header className="flex justify-between items-end mb-10 border-b border-[#1A1A1A] pb-8">
              <div>
                <h2 className="text-[#555] uppercase tracking-widest text-xs mb-1">
                  실시간 학급 대시보드
                </h2>
                <h1 className="text-4xl font-bold tracking-tighter">
                  {settings ? `${settings.grade}학년 ${settings.classNm}반 알림판` : "우리 반 알림판"}
                </h1>
              </div>
              <div className="text-right">
                <div className="text-5xl font-mono font-bold neon-text-green">
                  {timeString}
                </div>
                <div className="text-xs text-[#555] uppercase mt-2">{dateString}</div>
              </div>
            </header>

            {/* Widgets */}
            <div className="flex-1 flex justify-center w-full mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 w-full max-w-6xl">
                {/* Left: Timetable */}
                <div className="flex flex-col gap-4 relative">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-brand-green rounded-full animate-pulse" />
                    <h3 className="text-sm uppercase font-semibold text-[#888]">오늘의 시간표</h3>
                  </div>
                  
                  {isLoadingNeis ? (
                    <div className="text-[#555] p-6 text-center border border-[#333] rounded-xl border-dashed">
                      시간표와 급식을 불러오는 중입니다...
                    </div>
                  ) : neisError || timetable.length === 0 ? (
                    <div className="text-[#555] p-6 text-center border border-[#333] rounded-xl border-dashed">
                      오늘은 등록된 시간표가 없습니다.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {timetable.map((subject, idx) => (
                        <div 
                          key={idx}
                          className="glass-card p-5 rounded-xl flex justify-between items-center border-l-4 border-l-brand-green"
                        >
                          <div className="flex items-center gap-6">
                            <span className="font-mono text-[#555] w-8 text-xl">
                              {idx + 1}TH
                            </span>
                            <span className="font-bold text-2xl tracking-tight">
                              {subject}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Lunch */}
                <div className="flex flex-col gap-4 relative">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-brand-blue rounded-full animate-pulse" />
                    <h3 className="text-sm uppercase font-semibold text-[#888]">오늘의 급식</h3>
                  </div>

                  {isLoadingNeis ? (
                     <div className="text-[#555] p-6 text-center border border-[#333] rounded-xl border-dashed">
                       시간표와 급식을 불러오는 중입니다...
                     </div>
                  ) : neisError || lunch.length === 0 ? (
                    <div className="text-[#555] p-6 text-center border border-[#333] rounded-xl border-dashed">
                      오늘은 등록된 급식이 없습니다.
                    </div>
                  ) : (
                    <div className="glass-card p-8 rounded-2xl border-t-4 border-t-brand-blue h-full">
                      <div className="flex justify-center mb-8">
                        <Utensils className="w-12 h-12 text-brand-blue/50" />
                      </div>
                      <div className="flex flex-col gap-4 text-center">
                        {lunch.map((item, idx) => (
                          <div key={idx} className="text-2xl font-bold tracking-tight text-white">
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        
        ) : (
          <motion.div
            key="calling"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-12 z-50 m-4 rounded-3xl"
            style={{
              backgroundColor: 'rgba(10, 10, 10, 0.95)',
              border: '8px double #39ff14',
              boxShadow: '0 0 30px #39ff14, inset 0 0 30px #39ff14'
            }}
          >
            <div className="text-center w-full flex flex-col items-center">
              <motion.h2 
                className="text-[130px] font-black leading-none mb-6 tracking-tighter"
                style={{
                  color: '#fff0f5',
                  textShadow: '0 0 10px #ff073a, 0 0 20px #ff073a, 0 0 40px #ff073a, 0 0 80px #ff073a, 0 0 120px #ff073a',
                  animation: 'flicker 3s infinite alternate'
                }}
              >
                {activeAlert.studentName}
              </motion.h2>
              <p 
                className="text-5xl font-black tracking-widest uppercase mt-2 mb-10"
                style={{
                  color: '#fff0f5',
                  textShadow: '0 0 10px #ff073a, 0 0 20px #ff073a, 0 0 40px #ff073a',
                  animation: 'flicker 4s infinite alternate-reverse'
                }}
              >
                {activeAlert.message}
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center items-center gap-6 mb-12">
                {activeAlert.teacherName && (
                  <div className="px-8 py-4 rounded-2xl flex items-center gap-4 text-white bg-black/60"
                       style={{ border: '2px solid #00ffff', boxShadow: '0 0 15px #00ffff, inset 0 0 10px #00ffff', textShadow: '0 0 5px #00ffff' }}>
                     <User className="w-8 h-8 text-[#00ffff]" style={{ filter: 'drop-shadow(0 0 5px #00ffff)' }} />
                     <span className="text-3xl font-black">{activeAlert.teacherName} 선생님</span>
                  </div>
                )}
                {activeAlert.location && (
                  <div className="px-8 py-4 rounded-2xl flex items-center gap-4 text-white bg-black/60"
                       style={{ border: '2px solid #00ffff', boxShadow: '0 0 15px #00ffff, inset 0 0 10px #00ffff', textShadow: '0 0 5px #00ffff' }}>
                     <MapPin className="w-8 h-8 text-[#00ffff]" style={{ filter: 'drop-shadow(0 0 5px #00ffff)' }} />
                     <span className="text-3xl font-black">도착 장소: {activeAlert.location}</span>
                  </div>
                )}
              </div>

              <div className="w-full max-w-4xl flex flex-col items-center">
                <p className="text-3xl font-black tracking-widest uppercase mb-8"
                   style={{
                     color: '#fff',
                     textShadow: '0 0 10px #fffb00, 0 0 20px #fffb00, 0 0 40px #fffb00'
                   }}>
                  호명된 학생은 즉시 교무실로 와주세요.
                </p>
                
                <div className="w-full h-6 rounded-full overflow-hidden border-2 border-[#39ff14] bg-black/50 relative" style={{ boxShadow: '0 0 15px #39ff14' }}>
                  <motion.div 
                    className="absolute top-0 left-0 h-full"
                    style={{ backgroundColor: '#39ff14', boxShadow: '0 0 20px #39ff14' }}
                    initial={{ width: '100%' }}
                    animate={{ width: `${(timeLeft / 30) * 100}%` }}
                    transition={{ duration: 1, ease: 'linear' }}
                  />
                </div>
                <div className="flex justify-between items-center w-full mt-4">
                  <p className="text-[#39ff14] font-mono font-bold text-xl" style={{ textShadow: '0 0 5px #39ff14' }}>
                    {timeLeft}초 뒤 자동 닫힘
                  </p>
                  <button 
                    onClick={handleDismissAlert}
                    className="flex items-center gap-3 px-6 py-3 rounded-full bg-black/80 border-2 border-[#fffb00] text-white font-bold tracking-widest transition-all"
                    style={{ boxShadow: '0 0 10px #fffb00', textShadow: '0 0 5px #fffb00' }}
                  >
                    <CheckCircle className="w-5 h-5 text-[#fffb00]" style={{ filter: 'drop-shadow(0 0 5px #fffb00)' }} />
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 flex items-center justify-center z-50 p-6 backdrop-blur-md"
          >
            <div className="glass-card max-w-md w-full p-8 rounded-3xl border border-[#333]">
              <h2 className="text-2xl font-bold mb-6 tracking-widest uppercase">학급 설정</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase text-[#777] font-bold mb-2 block tracking-wider">학년</label>
                    <select 
                      value={tempSettings.grade}
                      onChange={e => setTempSettings({...tempSettings, grade: e.target.value})}
                      className="w-full bg-[#1A1A1C] p-3 rounded-lg border border-[#333] text-sm focus:border-brand-green outline-none transition-colors text-white"
                    >
                      {[1, 2, 3].map(g => <option key={g} value={g}>{g}학년</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-[#777] font-bold mb-2 block tracking-wider">반</label>
                    <select 
                      value={tempSettings.classNm}
                      onChange={e => setTempSettings({...tempSettings, classNm: e.target.value})}
                      className="w-full bg-[#1A1A1C] p-3 rounded-lg border border-[#333] text-sm focus:border-brand-green outline-none transition-colors text-white"
                    >
                      {Array.from({length: 15}, (_, i) => i + 1).map(c => <option key={c} value={c}>{c}반</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                {settings && (
                  <button 
                    onClick={() => setShowSettingsModal(false)}
                    className="flex-1 bg-[#1A1A1C] text-[#555] py-3 rounded-xl font-bold text-xs tracking-widest border border-[#333] hover:text-[#777] hover:bg-[#222] transition-colors"
                  >
                    취소
                  </button>
                )}
                <button 
                  onClick={handleSaveSettings}
                  className="flex-1 bg-brand-green text-black py-3 rounded-xl font-black text-xs tracking-widest shadow-[0_0_15px_rgba(0,255,136,0.3)] hover:brightness-110 transition-all"
                >
                  저장 및 적용
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

