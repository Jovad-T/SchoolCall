import { useState, useEffect, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../lib/firebase';
import { useCallState, CallState, useClassAnnouncement, useClassTimetable, useClassTimetableImage, useCustomMeal } from '../lib/store';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Utensils, Megaphone, Calendar, Settings, CheckCircle, User, MapPin, Maximize, Minimize } from 'lucide-react';
import clsx from 'clsx';

const alertSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

export default function ClassroomDisplay() {

  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Settings State
  const [settings, setSettings] = useState<{grade: string; classNm: string} | null>(null);
  
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempSettings, setTempSettings] = useState({
    grade: '2',
    classNm: '8'
  });

  // Load Settings
  useEffect(() => {
    const saved = localStorage.getItem('school_classroom_settings');
    if (saved) {
      const s = JSON.parse(saved);
      setSettings(s);
      setTempSettings(s);
    } else {
      setShowSettingsModal(true);
    }
  }, []);

  const handleSaveSettings = () => {
    localStorage.setItem('school_classroom_settings', JSON.stringify(tempSettings));
    setSettings(tempSettings);
    setShowSettingsModal(false);
  };

  const classId = settings ? `${settings.grade}-${settings.classNm}` : '';
  const { state, updateState } = useCallState(classId);
  const { announcement, updateAnnouncement } = useClassAnnouncement(settings?.grade || '', settings?.classNm || '');
  const { customTimetable } = useClassTimetable(settings?.grade || '', settings?.classNm || '');
  const { timetableImage } = useClassTimetableImage(settings?.grade || '', settings?.classNm || '');
  const { customMeal } = useCustomMeal();
  const [isEditingAnnounce, setIsEditingAnnounce] = useState(false);
  const [editAnnounceText, setEditAnnounceText] = useState('');
  
  const [currentTime, setCurrentTime] = useState(new Date());

  // Data State
  const [neisTimetable, setNeisTimetable] = useState<string[]>([]);
  const [timetable, setTimetable] = useState<string[]>([]);
  const [lunch, setLunch] = useState<string[]>([]);
  const [dinner, setDinner] = useState<string[]>([]);
  const [isLoadingNeis, setIsLoadingNeis] = useState(false);
  const [neisError, setNeisError] = useState(false);

  
  
  const [activeAlert, setActiveAlert] = useState<CallState | null>(null);
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          setIsWakeLockActive(true);
          
          wakeLockRef.current.addEventListener('release', () => {
            setIsWakeLockActive(false);
          });
        }
      } catch (err: any) {
        // Silently ignore permissions policy errors as it's expected in some iframe/Electron environments
        if (err.name !== 'NotAllowedError') {
          console.error('Wake Lock error:', err);
        }
        setIsWakeLockActive(false);
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  
  const [showAnnouncePopup, setShowAnnouncePopup] = useState(false);
  const prevAnnounceRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (prevAnnounceRef.current !== undefined) {
      if (announcement && announcement.trim() !== '' && announcement !== prevAnnounceRef.current) {
        setShowAnnouncePopup(true);
        alertSound.currentTime = 0;
        alertSound.play().catch(e => console.log('Audio play failed:', e));
        
        // Trigger Electron window focus/popup if running in Electron
        if (typeof window !== 'undefined') {
          if ((window as any).electron?.send) {
            (window as any).electron.send('trigger-call');
          } else if ((window as any).ipcRenderer?.send) {
            (window as any).ipcRenderer.send('trigger-call');
          }
        }

        const timer = setTimeout(() => {
          setShowAnnouncePopup(false);
        }, 15000);
        return () => clearTimeout(timer);
      }
    }
    prevAnnounceRef.current = announcement;
  }, [announcement]);


  // Time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Alert System
  useEffect(() => {
    if (state.callStatus && state.studentName) {
      setActiveAlert(state);
      alertSound.currentTime = 0;
      alertSound.play().catch(e => console.log('Audio play failed:', e));

      // Trigger Electron window focus/popup if running in Electron
      if (typeof window !== 'undefined') {
        if ((window as any).electron?.send) {
          (window as any).electron.send('trigger-call');
        } else if ((window as any).ipcRenderer?.send) {
          (window as any).ipcRenderer.send('trigger-call');
        }
      }
    } else {
      setActiveAlert(null);
    }
  }, [state]);

  // Neis Data
  useEffect(() => {
    if (!settings) return;

    const fetchNeisData = async () => {
      setIsLoadingNeis(true);
      setNeisError(false);

      const d = new Date();
      const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

      // Custom Meal 확인
      if (customMeal && customMeal.date === ymd) {
        setLunch(customMeal.lunch || []);
        setDinner(customMeal.dinner || []);
      }

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
          setNeisTimetable(rows.map((r: any) => r.ITRT_CNTNT));
        } else {
          setNeisTimetable([]);
        }

        // Parse Meals
        if (!customMeal || customMeal.date !== ymd) {
          if (lunchData.mealServiceDietInfo && lunchData.mealServiceDietInfo[1].row) {
            const rows = lunchData.mealServiceDietInfo[1].row;
            
            let parsedLunch: string[] = [];
            let parsedDinner: string[] = [];
            
            rows.forEach((row: any) => {
              const rawMenu = row.DDISH_NM;
              const cleaned = rawMenu
                .split('<br/>')
                .map((item: string) => item.replace(/[0-9.]/g, '').replace(/[^가-힣a-zA-Z\s]/g, '').trim())
                .filter(Boolean);
              
              if (row.MMEAL_SC_CODE === '2') {
                parsedLunch = cleaned;
              } else if (row.MMEAL_SC_CODE === '3') {
                parsedDinner = cleaned;
              }
            });
            
            setLunch(parsedLunch);
            setDinner(parsedDinner);
          } else {
            setLunch([]);
            setDinner([]);
          }
        }
      } catch (err) {
        setNeisError(true);
      } finally {
        setIsLoadingNeis(false);
      }
    };

    fetchNeisData();
  }, [settings]);

  useEffect(() => {
    const dayOfWeek = currentTime.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5 && customTimetable && customTimetable[dayOfWeek.toString()]) {
      const customDayTt = customTimetable[dayOfWeek.toString()].filter((sub: string) => sub.trim() !== '');
      if (customDayTt.length > 0) {
        setTimetable(customDayTt);
        return;
      }
    }
    setTimetable(neisTimetable);
  }, [neisTimetable, customTimetable, currentTime]);

  const timeString = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const dateString = currentTime.toLocaleDateString('ko-KR', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen overflow-hidden relative" style={{ backgroundColor: '#1b3a26', color: '#f8f9fa', fontFamily: "'Chalkboard SE', 'Comic Sans MS', 'Gowun Dodum', cursive, sans-serif" }}>
      {/* Wooden Frame */}
      <div className="absolute inset-0 border-[16px] md:border-[24px] border-[#4a2e15] z-50 pointer-events-none shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]" />
      
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.1),_transparent_75%)]" />
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stucco.png')] opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.9)] pointer-events-none" />
      </div>

      {!settings && (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/80 backdrop-blur-sm">
          <div className="glass-card p-10 rounded-3xl text-center max-w-md w-full border border-[#333]">
            <h2 className="text-3xl font-black mb-4 tracking-tighter">초기 설정 필요</h2>
            <p className="text-[#888] mb-8">
              우측 상단의 톱니바퀴 아이콘을 눌러<br />현재 학급을 설정해주세요.
            </p>
            <div className="animate-bounce">
              <Settings className="w-8 h-8 text-[#555] mx-auto" />
            </div>
          </div>
        </div>
      )}

      {/* Settings Button */}
      <button 
        onClick={() => setShowSettingsModal(true)}
        className="absolute top-6 right-6 z-40 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white/50 hover:text-white transition-colors backdrop-blur border border-white/20"
      >
        <Settings className="w-6 h-6" />
      </button>

      {/* Fullscreen Toggle Button */}
      <button 
        onClick={toggleFullscreen}
        className="absolute bottom-6 right-6 z-40 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white/50 hover:text-white transition-colors backdrop-blur border border-white/20"
        title={isFullscreen ? "전체화면 종료" : "전체화면"}
      >
        {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
      </button>

      <AnimatePresence mode="wait">
        {activeAlert ? (
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
                  WebkitTextStroke: '2px #ff0055'
                }}
                animate={{ scale: [1, 1.05, 1], rotate: [-1, 1, -1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                {activeAlert.studentName}
              </motion.h2>
              
              <motion.div 
                className="bg-black/80 px-12 py-6 rounded-full border-4 border-[#ff073a] shadow-[0_0_30px_rgba(255,7,58,0.5)]"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <p className="text-5xl font-bold tracking-tight text-white flex items-center gap-6">
                  <span>{activeAlert.message}</span>
                  <span className="text-[#ff073a]">|</span>
                  <span className="text-[#aaa]">{activeAlert.location}</span>
                </p>
              </motion.div>
              
              {activeAlert.teacherName && (
                <div className="mt-12 text-2xl text-[#888] font-bold tracking-widest uppercase">
                  호출자: {activeAlert.teacherName} 선생님
                </div>
              )}
            </div>
          </motion.div>
        ) : showAnnouncePopup ? (
          <motion.div
            key="announcement-popup"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-12 z-50 m-4 rounded-3xl cursor-pointer"
            onClick={() => setShowAnnouncePopup(false)}
            style={{
              backgroundColor: 'rgba(10, 10, 10, 0.95)',
              border: '8px double #ffcc00',
              boxShadow: '0 0 30px #ffcc00, inset 0 0 30px #ffcc00'
            }}
          >
            <div className="text-center w-full flex flex-col items-center">
              <div className="flex items-center gap-6 mb-8 text-[#ffcc00]">
                <Megaphone className="w-24 h-24 animate-pulse" />
                <h2 className="text-6xl font-black tracking-widest uppercase">새로운 전달사항</h2>
              </div>
              
              <motion.div 
                className="bg-black/80 px-16 py-12 rounded-3xl border-4 border-[#ffcc00] shadow-[0_0_30px_rgba(255,204,0,0.3)] max-w-5xl w-full"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <p className="text-5xl md:text-6xl font-bold tracking-tight text-white leading-relaxed whitespace-pre-wrap">
                  {announcement}
                </p>
              </motion.div>
              
              <div className="mt-12 text-xl text-[#888] font-bold tracking-widest">
                클릭하여 닫기 (잠시 후 자동 닫힘)
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full h-screen flex flex-col p-12 lg:p-20 relative z-10"
          >
            {/* Header: Date & Time */}
            <header className="flex justify-between items-end mb-10 border-b-4 border-white/20 border-dashed pb-8 px-4">
              <div>
                <h2 className="text-white/70 font-bold uppercase tracking-widest text-sm mb-2" style={{ textShadow: '1px 1px 2px rgba(255,255,255,0.2)' }}>
                  실시간 학급 대시보드
                </h2>
                <h1 className="text-5xl font-bold tracking-tighter text-white/95" style={{ textShadow: '2px 2px 4px rgba(255,255,255,0.3)' }}>
                  {settings ? `${settings.grade}학년 ${settings.classNm}반 알림판` : "우리 반 알림판"}
                </h1>
              </div>
              <div className="text-right">
                <div className="text-6xl font-black tracking-tighter mb-2 text-white/95" style={{ textShadow: '2px 2px 4px rgba(255,255,255,0.3)' }}>
                  {timeString}
                </div>
                <div className="text-sm text-white/70 font-bold uppercase mt-2">{dateString}</div>
              </div>
            </header>

            {/* Widgets & Announcements */}
            <div className="flex-1 flex justify-center w-full mt-4 pb-8 overflow-y-auto custom-scrollbar">
              <div className="flex flex-col gap-8 w-full max-w-6xl">
                
                {/* Top: Timetable and Meals */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
                  {/* Left: Timetable */}
                  <div className="flex flex-col gap-4 relative">
                    <div className="flex items-center gap-2 mb-2 px-2">
                      <h3 className="text-lg font-bold text-white/80" style={{ textShadow: '1px 1px 2px rgba(255,255,255,0.2)' }}>오늘의 시간표</h3>
                    </div>
                    
                    {timetableImage ? (
                      <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-black/40 rounded-2xl border-4 border-white/20 border-dashed overflow-hidden p-2">
                        <img src={timetableImage} alt="시간표 이미지" className="object-contain w-full h-full max-h-[500px]" />
                      </div>
                    ) : isLoadingNeis ? (
                      <div className="text-white/60 p-6 text-center border-4 border-white/20 rounded-xl border-dashed h-full flex items-center justify-center font-bold text-xl">
                        시간표와 급식을 불러오는 중입니다...
                      </div>
                    ) : neisError || timetable.length === 0 ? (
                      <div className="text-white/60 p-6 text-center border-4 border-white/20 rounded-xl border-dashed h-full flex items-center justify-center font-bold text-xl">
                        오늘은 등록된 시간표가 없습니다.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {timetable.map((subject, idx) => (
                          <div 
                            key={idx}
                            className="p-3 md:p-4 flex items-center border-b-2 border-white/20 border-dashed"
                            style={{ textShadow: '1px 1px 3px rgba(255,255,255,0.2)' }}
                          >
                            <div className="flex items-center gap-6">
                              <span className="text-white/70 w-8 text-xl font-bold">
                                {idx + 1}
                              </span>
                              <span className="font-bold text-2xl md:text-3xl tracking-tight text-white/95">
                                {subject}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: Meals */}
                  <div className="flex flex-col gap-4 relative">
                    <div className="flex items-center gap-2 mb-2 px-2">
                      <h3 className="text-lg font-bold text-white/80" style={{ textShadow: '1px 1px 2px rgba(255,255,255,0.2)' }}>오늘의 급식</h3>
                    </div>

                    {isLoadingNeis ? (
                       <div className="text-white/60 p-6 text-center border-4 border-white/20 rounded-xl border-dashed h-full flex items-center justify-center font-bold text-xl">
                         시간표와 급식을 불러오는 중입니다...
                       </div>
                    ) : neisError || (lunch.length === 0 && dinner.length === 0) ? (
                      <div className="text-white/60 p-6 text-center border-4 border-white/20 rounded-xl border-dashed h-full flex items-center justify-center font-bold text-xl">
                        오늘은 등록된 급식이 없습니다.
                      </div>
                    ) : (
                      <div className="flex flex-col 2xl:flex-row gap-4 h-full overflow-x-auto pb-2 custom-scrollbar">
                        {/* Lunch Block */}
                        {lunch.length > 0 && (
                          <div className="flex-1 min-w-[240px] p-6 rounded-2xl border-4 border-white/30 border-dashed flex flex-col justify-center relative bg-white/5">
                            <div className="absolute top-4 left-6 flex items-center gap-2 text-white/80">
                              <Utensils className="w-5 h-5" />
                              <span className="text-sm font-bold tracking-wider" style={{ textShadow: '1px 1px 2px rgba(255,255,255,0.3)' }}>점심</span>
                            </div>
                            <div className="flex flex-col gap-2 text-center mt-6">
                              {lunch.map((item, idx) => (
                                <div 
                                  key={idx} 
                                  className={clsx(
                                    "font-bold text-white/95 whitespace-nowrap",
                                    item.length >= 7 ? "text-base md:text-lg tracking-tighter" : "text-xl md:text-2xl tracking-tight"
                                  )}
                                  style={{ textShadow: '1px 1px 3px rgba(255,255,255,0.2)' }}
                                >
                                  {item}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Dinner Block */}
                        {dinner.length > 0 && (
                          <div className="flex-1 min-w-[240px] p-6 rounded-2xl border-4 border-white/10 border-dashed flex flex-col justify-center relative bg-white/5">
                            <div className="absolute top-4 left-6 flex items-center gap-2 text-white/50">
                              <Utensils className="w-5 h-5" />
                              <span className="text-sm font-bold tracking-wider">저녁</span>
                            </div>
                            <div className="flex flex-col gap-2 text-center mt-6">
                              {dinner.map((item, idx) => (
                                <div 
                                  key={idx} 
                                  className={clsx(
                                    "font-bold text-white/70 whitespace-nowrap",
                                    item.length >= 7 ? "text-base md:text-lg tracking-tighter" : "text-xl md:text-2xl tracking-tight"
                                  )}
                                  style={{ textShadow: '1px 1px 3px rgba(255,255,255,0.1)' }}
                                >
                                  {item}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom: Teacher Announcements */}
                <div className="flex flex-col gap-4 mt-2">
                  <div className="flex items-center gap-2 mb-2 mt-4 px-2">
                    <h3 className="text-lg font-bold text-white/80" style={{ textShadow: '1px 1px 2px rgba(255,255,255,0.2)' }}>선생님의 전달사항</h3>
                  </div>
                  <div 
                    className="p-6 md:p-10 rounded-2xl border-4 border-white/40 border-dashed min-h-[220px] flex items-center justify-center relative group cursor-pointer bg-white/5 hover:bg-white/10 transition-colors"
                    onClick={() => {
                      if (!isEditingAnnounce) {
                        setEditAnnounceText(announcement || '');
                        setIsEditingAnnounce(true);
                      }
                    }}
                  >
                    {!isEditingAnnounce && (
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-sm font-bold text-white bg-black/40 px-3 py-1 rounded-full border border-white/30">클릭하여 분필로 쓰기</span>
                      </div>
                    )}
                    
                    {isEditingAnnounce ? (
                      <div className="w-full flex flex-col gap-3">
                        <textarea
                          autoFocus
                          value={editAnnounceText}
                          onChange={e => setEditAnnounceText(e.target.value)}
                          className="w-full bg-black/40 p-4 rounded-xl border-2 border-white/50 text-2xl md:text-3xl font-bold tracking-tight text-white leading-relaxed focus:outline-none resize-none min-h-[140px]"
                          placeholder="전달사항을 적어주세요..."
                          style={{ fontFamily: "'Chalkboard SE', 'Comic Sans MS', 'Gowun Dodum', cursive, sans-serif" }}
                        />
                        <div className="flex justify-end gap-3">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setIsEditingAnnounce(false); }}
                            className="px-6 py-2 bg-white/10 text-white rounded-lg font-bold hover:bg-white/20 border border-white/20"
                          >
                            지우기
                          </button>
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              updateAnnouncement(editAnnounceText);
                              setIsEditingAnnounce(false); 
                            }}
                            className="px-6 py-2 bg-white/80 text-black rounded-lg font-bold hover:bg-white"
                          >
                            적기
                          </button>
                        </div>
                      </div>
                    ) : announcement ? (
                      <p className="text-3xl md:text-4xl font-bold tracking-tight text-white/95 leading-relaxed whitespace-pre-wrap text-center w-full" style={{ textShadow: '2px 2px 5px rgba(255,255,255,0.4)' }}>
                        {announcement}
                      </p>
                    ) : (
                      <p className="text-2xl font-bold tracking-tight text-white/40 text-center w-full" style={{ textShadow: '1px 1px 2px rgba(255,255,255,0.1)' }}>
                        오늘 등록된 전달사항이 없습니다. (클릭하여 칠판에 적기)
                      </p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettingsModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-6"
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
