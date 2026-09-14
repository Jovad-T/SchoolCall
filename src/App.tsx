import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Clock, Settings, X, Calendar, Utensils, BookOpen, Volume2, ShieldAlert, LogOut, Send, Monitor, Smartphone, Wrench, ArrowLeft, CheckCircle2, User, MapPin, Layers, Plus, Trash2, Edit3, Upload, FileText, Image as ImageIcon, Database, Key, Lock, Loader2, Maximize, Minimize, Moon, RefreshCw, Save } from 'lucide-react';

// 🔥 Firebase 실시간 통신 모듈 불러오기
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBDSR5PlGMZv6lUex279A4yWYL_QVmwKUs",
  authDomain: "schoolcallapp-cdb3d.firebaseapp.com",
  databaseURL: "https://schoolcallapp-cdb3d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "schoolcallapp-cdb3d",
  storageBucket: "schoolcallapp-cdb3d.firebasestorage.app",
  messagingSenderId: "18583169071",
  appId: "1:18583169071:web:bb43ad116d189f1a1bbeda"
};

let db: any = null;
try {
  const app = initializeApp(firebaseConfig);
  db = getDatabase(app);
} catch (e) {
  console.error("Firebase 연결 실패:", e);
}

export const APP_VERSION = 'v1.1.0';

export default function App() {
  const defaultMode = localStorage.getItem('default_view_mode') as 'classroom' | 'remote' | 'admin' | null;
  const urlParamsForView = new URLSearchParams(window.location.search);
  const urlG = urlParamsForView.get('g');
  const urlC = urlParamsForView.get('c');
  const isDirectClass = window.location.pathname.includes('/class') && urlG && urlC;
  
  const [viewMode, setViewMode] = useState<'select' | 'classroom' | 'remote' | 'admin'>(
    isDirectClass ? 'classroom' : (defaultMode || 'select')
  );
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const urlParams = new URLSearchParams(window.location.search);
  let initialMode = (urlParams.get('mode') as 'all' | 'office' | 'class') || 'all';
  if (window.location.pathname.includes('/office')) initialMode = 'office';
  if (window.location.pathname.includes('/class')) initialMode = 'class';
  const [appEnvMode, setAppEnvMode] = useState<'all' | 'office' | 'class'>(initialMode);
  
  const [updateAvailable, setUpdateAvailable] = useState<{isAvailable: boolean, latest: string, url: string} | null>(null);

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const response = await fetch('https://school-call-five.vercel.app/version.json?t=' + new Date().getTime());
        const data = await response.json();
        
        const currentParts = APP_VERSION.replace('v', '').split('.').map(Number);
        const latestParts = data.latestVersion.replace('v', '').split('.').map(Number);
        
        let isNewer = false;
        for(let i=0; i<3; i++) {
            if ((latestParts[i] || 0) > (currentParts[i] || 0)) { isNewer = true; break; }
            if ((latestParts[i] || 0) < (currentParts[i] || 0)) { break; }
        }

        if (isNewer) {
          setUpdateAvailable({
            isAvailable: true,
            latest: data.latestVersion,
            url: data.downloadUrl
          });
        }
      } catch (e) {
        console.log('버전 확인 실패:', e);
      }
    };
    checkForUpdates();
  }, []);

  const renderUpdateBadge = () => {
    if (!updateAvailable?.isAvailable) return null;
    return (
      <a 
        href={updateAvailable.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold animate-pulse hover:bg-red-500/30 transition-colors"
        title="새로운 설치 파일(.exe) 다운로드"
        style={{ WebkitAppRegion: "no-drag" } as any}
      >
        <span>🚀 업데이트: {updateAvailable.latest}</span>
      </a>
    );
  };

  useEffect(() => {
    if ((window as any).electron?.ipcRenderer) {
      (window as any).electron.ipcRenderer.invoke('get-app-mode')
        .then((mode: any) => {
           setAppEnvMode(mode);
           if (mode === 'class') {
             setSchoolConfig((prev: any) => {
               if (prev.currentGrade && prev.currentClass) {
                 setTimeout(() => setViewMode('classroom'), 0);
               }
               return prev;
             });
           }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };
  
  const [currentTime, setCurrentTime] = useState(new Date());

  const [schoolConfig, setSchoolConfig] = useState(() => {
    const saved = localStorage.getItem('school_config');
    const parsed = saved ? JSON.parse(saved) : {};
    return { 
      schoolName: parsed.schoolName || '사직여자고등학교', 
      gradeCounts: parsed.gradeCounts || { 1: 8, 2: 8, 3: 8 },
      currentGrade: Number(urlG) || parsed.currentGrade || 0, 
      currentClass: Number(urlC) || parsed.currentClass || 0,
      classroomTheme: parsed.classroomTheme || 'default',
      appinServerUrl: parsed.appinServerUrl || '',
      neisApiKey: parsed.neisApiKey || '',
      geminiApiKey: parsed.geminiApiKey || '',
      eduCode: parsed.eduCode || 'C10',
      schoolCode: parsed.schoolCode || '7150144',
      adminPin: parsed.adminPin || '0000',
      ttsVoiceURI: parsed.ttsVoiceURI || '',
      ttsRate: parsed.ttsRate !== undefined ? parsed.ttsRate : 0.75,
      popupTimeout: parsed.popupTimeout !== undefined ? parsed.popupTimeout : 60,
      forcePopupDuringClass: parsed.forcePopupDuringClass !== undefined ? Boolean(parsed.forcePopupDuringClass) : false
    };
  });

  const [classRosters, setClassRosters] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('class_rosters_map');
    if (saved) return JSON.parse(saved);
    return {
      "2-8": [
        '1번 금리예', '2번 김아연', '3번 김혜원', '4번 문소정', '5번 박비주안', '6번 박서연', 
        '7번 박서윤', '8번 박시은', '9번 박제린', '10번 박채희', '11번 백서연', '12번 석지민', 
        '13번 석채영', '14번 성보경', '15번 성예원', '16번 양다현', '17번 우다경', '18번 유예서'
      ]
    };
  });

  const [dailySchedule, setDailySchedule] = useState(() => {
    const saved = localStorage.getItem('daily_schedule');
    return saved ? JSON.parse(saved) : {
      1: { startH: '08', startM: '40', endH: '09', endM: '30' },
      2: { startH: '09', startM: '40', endH: '10', endM: '30' },
      3: { startH: '10', startM: '40', endH: '11', endM: '30' },
      4: { startH: '11', startM: '40', endH: '12', endM: '30' },
      5: { startH: '13', startM: '30', endH: '14', endM: '20' },
      6: { startH: '14', startM: '30', endH: '15', endM: '20' },
      7: { startH: '15', startM: '30', endH: '16', endM: '20' },
    };
  });

  // 💡 [안전망 추가] 로딩할 때 저장소가 비정상적으로 크면(쓰레기 데이터) 자동으로 비워줍니다.
  const [classPopupTimeouts, setClassPopupTimeouts] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('class_popup_timeouts');
    return saved ? JSON.parse(saved) : {};
  });
  const [tempClassPopupTimeouts, setTempClassPopupTimeouts] = useState<Record<string, number>>(classPopupTimeouts);

  const [timetableDetails, setTimetableDetails] = useState<Record<string, { location: string, memo: string }>>(() => {
    const saved = localStorage.getItem('timetable_details');
    return saved ? JSON.parse(saved) : {};
  });

  const [subjectModal, setSubjectModal] = useState<{ isOpen: boolean; period: number; subject: string; location: string; memo: string }>({ isOpen: false, period: 0, subject: '', location: '', memo: '' });

  const [classTimetables, setClassTimetables] = useState<Record<string, Record<string, Record<number, string>>>>(() => {
    const saved = localStorage.getItem('class_timetables_map');
    if (saved) {
      if (saved.length > 500000) {
        console.warn("시간표 저장소 용량 초과 감지! 자동 초기화합니다.");
        localStorage.removeItem('class_timetables_map');
        return {};
      }
      try { return JSON.parse(saved); } catch(e) { return {}; }
    }
    return {};
  });

  const [meals, setMeals] = useState<Record<string, {lunch: string[], dinner: string[]}>>(() => {
    const saved = localStorage.getItem('meal_data');
    if (saved) {
      if (saved.length > 500000) {
        console.warn("급식 저장소 용량 초과 감지! 자동 초기화합니다.");
        localStorage.removeItem('meal_data');
        return {};
      }
      try { return JSON.parse(saved); } catch(e) { return {}; }
    }
    return {};
  });

  const [customCallPresets, setCustomCallPresets] = useState<string[]>(() => {
    const saved = localStorage.getItem('custom_call_presets');
    return saved ? JSON.parse(saved) : ['교무실로 오세요', '수행평가 평가지 가지고 오세요', '상담이 있으니 교무실로 오세요', '프린트물을 챙겨가세요', '긴급 호출입니다. 즉시 교무실로 오세요'];
  });
  const [tempCustomCallPresets, setTempCustomCallPresets] = useState<string[]>(customCallPresets);

  const [announcement, setAnnouncement] = useState('조례사항 없습니다.\n오늘 하루도 즐겁게 열심히 공부합시다~');
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [pendingAnnouncements, setPendingAnnouncements] = useState<{id: string, text: string, time: number, duration?: number}[]>(() => {
    try {
      const saved = localStorage.getItem('pending_announcements_queue');
      if (saved) {
        const parsed = JSON.parse(saved);
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const validAnnouncements = parsed.filter((ann: any) => ann.time > oneDayAgo);
        
        // 만약 오래된 알림이 지워졌다면 로컬스토리지도 업데이트
        if (validAnnouncements.length !== parsed.length) {
          localStorage.setItem('pending_announcements_queue', JSON.stringify(validAnnouncements));
        }
        return validAnnouncements;
      }
      return [];
    } catch(e) {
      return [];
    }
  });
  const [currentAnnouncementDuration, setCurrentAnnouncementDuration] = useState<number | null>(null);
  const [popupCountdown, setPopupCountdown] = useState<number | null>(null);
  const [sendSuccessToast, setSendSuccessToast] = useState(false);
  const [memoSuccessToast, setMemoSuccessToast] = useState(false);
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);
  const [isExited, setIsExited] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<string[]>([]);
  const [selectedCallMessage, setSelectedCallMessage] = useState<string>('교무실로 오세요');
  const [teacherName, setTeacherName] = useState<string>('');
  const [locationName, setLocationName] = useState<string>('교무실');
  const [customAnnouncement, setCustomAnnouncement] = useState<string>('');
  const [isGlobalSend, setIsGlobalSend] = useState<boolean>(false);
  const [isForcePopupSend, setIsForcePopupSend] = useState<boolean>(false);
  const [remoteDayOfWeek, setRemoteDayOfWeek] = useState<string>(() => {
    const d = new Date().getDay();
    return (d >= 1 && d <= 5) ? String(d) : '1';
  });

  const [adminDate, setAdminDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const adminDateKey = adminDate.replace(/-/g, '');
  const adminDayOfWeek = String(new Date(adminDate).getDay());

  const [adminSchoolName, setAdminSchoolName] = useState(schoolConfig.schoolName);
  const [adminGradeCounts, setAdminGradeCounts] = useState(schoolConfig.gradeCounts);
  const [adminSelectedGrade, setAdminSelectedGrade] = useState(schoolConfig.currentGrade);
  const [adminSelectedClass, setAdminSelectedClass] = useState(schoolConfig.currentClass);
  const [adminNeisApiKey, setAdminNeisApiKey] = useState(schoolConfig.neisApiKey);
  const [adminGeminiApiKey, setAdminGeminiApiKey] = useState(schoolConfig.geminiApiKey);
  const [adminEduCode, setAdminEduCode] = useState(schoolConfig.eduCode);
  const [adminSchoolCode, setAdminSchoolCode] = useState(schoolConfig.schoolCode);
  const [adminTtsVoiceURI, setAdminTtsVoiceURI] = useState(schoolConfig.ttsVoiceURI || '');
  const [adminTtsRate, setAdminTtsRate] = useState(schoolConfig.ttsRate !== undefined ? schoolConfig.ttsRate : 0.75);
  const [adminPopupTimeout, setAdminPopupTimeout] = useState(schoolConfig.popupTimeout !== undefined ? schoolConfig.popupTimeout : 60);
  const [adminForcePopupDuringClass, setAdminForcePopupDuringClass] = useState<boolean>(Boolean(schoolConfig.forcePopupDuringClass));
  const [adminPinInput, setAdminPinInput] = useState(schoolConfig.adminPin);
  const [adminClassroomTheme, setAdminClassroomTheme] = useState(schoolConfig.classroomTheme || 'default');
  const [adminAppinServerUrl, setAdminAppinServerUrl] = useState(schoolConfig.appinServerUrl || '');

  const [editTargetGrade, setEditTargetGrade] = useState(schoolConfig.currentGrade);
  const [editTargetClass, setEditTargetClass] = useState(schoolConfig.currentClass);
  const [newStudentNum, setNewStudentNum] = useState<string>('1');
  const [newStudentNameOnly, setNewStudentNameOnly] = useState<string>('');

  const [tempClassRosters, setTempClassRosters] = useState(classRosters);
  const [tempDailySchedule, setTempDailySchedule] = useState(dailySchedule);
  const [tempClassTimetables, setTempClassTimetables] = useState(classTimetables);
  const [tempMeals, setTempMeals] = useState(meals);

  const [timetableFileName, setTimetableFileName] = useState('');
  const [mealFileName, setMealFileName] = useState('');
  const [isNeisLoading, setIsNeisLoading] = useState(false);
  const [rememberChoice, setRememberChoice] = useState(false);
  const [pinModal, setPinModal] = useState({ isOpen: false, input: '', error: '' });

  const lastSyncTimeRef = useRef<number>(Date.now());
  const isInitialSyncRef = useRef<boolean>(true);

  const todayStr = `${currentTime.getFullYear()}${String(currentTime.getMonth() + 1).padStart(2, '0')}${String(currentTime.getDate()).padStart(2, '0')}`;
  const currentKey = `${schoolConfig.currentGrade}-${schoolConfig.currentClass}`;
  
  let todayMealsObj = meals[todayStr];
  if (!todayMealsObj && (meals as any).lunch) todayMealsObj = meals as any;
  if (!todayMealsObj) todayMealsObj = { lunch: ['오늘의 급식 정보가 없습니다.'], dinner: ['오늘의 급식 정보가 없습니다.'] };

  const currentDayNum = currentTime.getDay();
  // 주말(0: 일요일, 6: 토요일)일 경우 테스트 및 기본 표시를 위해 월요일(1) 기준 표시
  const currentDayOfWeekStr = (currentDayNum >= 1 && currentDayNum <= 5) ? String(currentDayNum) : '1';
  let todayTimetableObj = classTimetables[currentKey]?.[currentDayOfWeekStr];
  if (!todayTimetableObj || Object.values(todayTimetableObj).every(v => v === '-')) {
    todayTimetableObj = classTimetables[currentKey]?.['1'] || todayTimetableObj;
  }
  if (!todayTimetableObj) todayTimetableObj = { 1: '-', 2: '-', 3: '-', 4: '-', 5: '-', 6: '-', 7: '-' };

  const currentStudents = classRosters[currentKey] || [];

  const editKey = `${editTargetGrade}-${editTargetClass}`;
  const editTargetStudents = tempClassRosters[editKey] || [];
  const currentAdminTimetable = tempClassTimetables[editKey]?.[adminDayOfWeek] || { 1: '-', 2: '-', 3: '-', 4: '-', 5: '-', 6: '-', 7: '-' };
  const currentAdminMeals = tempMeals[adminDateKey] || { lunch: [], dinner: [] };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);


  useEffect(() => {
    if ((window as any).electron && (window as any).electron.ipcRenderer) {
      (window as any).electron.ipcRenderer.on('timetable-auto-updated', (newData: any) => {
        console.log("[자동 동기화] 압핀 시간표 데이터 수신 완료", newData);
        setClassTimetables(newData);
        setTempClassTimetables(newData);
        try {
          localStorage.setItem('class_timetables_map', JSON.stringify(newData));
        } catch(e) {}
        
        if (db) {
           import("firebase/database").then(({ ref: dbRef, set }) => {
             set(dbRef(db, 'globalData/classTimetables'), JSON.parse(JSON.stringify(newData))).catch(console.error);
           });
        }
      });
    }
  }, [db]);

  useEffect(() => {
    if (!db) return;
    const globalRef = ref(db, 'globalData');
    const unsubscribe = onValue(globalRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        if (data.schoolConfig) {
          setSchoolConfig(prev => ({ ...data.schoolConfig, currentGrade: prev.currentGrade, currentClass: prev.currentClass }));
          if (data.schoolConfig.forcePopupDuringClass !== undefined) {
            setAdminForcePopupDuringClass(Boolean(data.schoolConfig.forcePopupDuringClass));
          }
        }
        if (data.classRosters) setClassRosters(data.classRosters);
        if (data.dailySchedule) setDailySchedule(data.dailySchedule);
        if (data.classTimetables) setClassTimetables(data.classTimetables);
        if (data.classPopupTimeouts) {
          setClassPopupTimeouts(data.classPopupTimeouts);
          try { localStorage.setItem('class_popup_timeouts', JSON.stringify(data.classPopupTimeouts)); } catch(e) {}
        }
        if (data.timetableDetails) {
          setTimetableDetails(data.timetableDetails);
          try { localStorage.setItem('timetable_details', JSON.stringify(data.timetableDetails)); } catch(e) {}
        }
        if (data.meals) setMeals(data.meals);
        if (data.customCallPresets) {
          setCustomCallPresets(data.customCallPresets);
          try { localStorage.setItem('custom_call_presets', JSON.stringify(data.customCallPresets)); } catch(e) {}
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const getScheduleForPeriod = (p: number) => {
    if (!dailySchedule) return null;
    if (Array.isArray(dailySchedule)) {
      if (dailySchedule.length >= 8) return dailySchedule[p];
      if (dailySchedule.length === 7) return dailySchedule[p - 1];
      return dailySchedule[p] || dailySchedule[p - 1];
    }
    return dailySchedule[p] || dailySchedule[String(p)] || dailySchedule[p - 1];
  };

  const isClassTime = () => {
    const day = currentTime.getDay();
    if (day === 0 || day === 6) return false;

    const currentH = currentTime.getHours();
    const currentM = currentTime.getMinutes();
    const currentTotalM = currentH * 60 + currentM;

    for (let p = 1; p <= 7; p++) {
      const sch = getScheduleForPeriod(p);
      if (sch && sch.startH && sch.startM && sch.endH && sch.endM) {
        const startTotalM = Number(sch.startH) * 60 + Number(sch.startM);
        const endTotalM = Number(sch.endH) * 60 + Number(sch.endM);

        if (currentTotalM >= startTotalM && currentTotalM <= endTotalM) {
          return true;
        }
      }
    }
    return false;
  };

  const getCurrentPeriodText = () => {
    const day = currentTime.getDay();
    if (day === 0 || day === 6) return "주말 (일과 없음)";

    const currentH = currentTime.getHours();
    const currentM = currentTime.getMinutes();
    const currentTotalM = currentH * 60 + currentM;

    for (let p = 1; p <= 7; p++) {
      const sch = getScheduleForPeriod(p);
      if (sch && sch.startH && sch.startM && sch.endH && sch.endM) {
        const startTotalM = Number(sch.startH) * 60 + Number(sch.startM);
        const endTotalM = Number(sch.endH) * 60 + Number(sch.endM);

        // 일과 전
        if (p === 1 && currentTotalM < startTotalM) {
          return `수업 전 (${sch.startH}:${sch.startM} 시작)`;
        }

        // 현재 수업 중
        if (currentTotalM >= startTotalM && currentTotalM <= endTotalM) {
          return `${p}교시 수업 중 (${sch.startH}:${sch.startM} - ${sch.endH}:${sch.endM})`;
        }
        
        // 쉬는 시간 (다음 교시 시작 전까지)
        const nextSch = getScheduleForPeriod(p + 1);
        if (nextSch && nextSch.startH && nextSch.startM) {
          const nextStartTotalM = Number(nextSch.startH) * 60 + Number(nextSch.startM);
          if (currentTotalM > endTotalM && currentTotalM < nextStartTotalM) {
            return `쉬는 시간 (${nextSch.startH}:${nextSch.startM}에 ${p + 1}교시 시작)`;
          }
        } else if (p === 7 && currentTotalM > endTotalM) {
          return "모든 일과 종료";
        }
      }
    }
    
    // Fallback if loop ends and no condition met, check if past last period
    const lastSch = getScheduleForPeriod(7);
    if (lastSch && lastSch.endH && lastSch.endM) {
      const endTotalM = Number(lastSch.endH) * 60 + Number(lastSch.endM);
      if (currentTotalM > endTotalM) {
        return "모든 일과 종료";
      }
    }

    return "일과 시간 외";
  };

  const playNeonAlertSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
        
        gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
        gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime + startTime);
        osc.stop(ctx.currentTime + startTime + duration);
      };
      playTone(659.25, 0, 0.8);
      playTone(523.25, 0.25, 1.2);
    } catch (e) {
      console.error("오디오 재생 실패:", e);
    }
  };

  const speakAnnouncementText = (rawText: string) => {
    try {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      
      let textToSpeak = rawText;
      if (rawText.includes('[대상:')) {
        const lines = rawText.split('\n');
        if (lines.length >= 2) {
          const target = lines[0].replace(/\[대상:\s*/, '').replace(']', '').trim();
          const message = lines[1].replace('호출 내용: ', '').trim();
          
          const targetText = target === '학급 전체' ? '안내 말씀 드립니다.' : `${target} 학생,`;
          textToSpeak = `${targetText} ${message}`;
        }
      }

      // TTS가 '23번'을 '스물세번'이 아닌 '이십삼번'으로 정확히 읽도록 변환
      textToSpeak = textToSpeak.replace(/(\d+)번/g, (match, p1) => {
        const num = parseInt(p1, 10);
        const units = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
        const tens = ['', '십', '이십', '삼십', '사십', '오십', '육십', '칠십', '팔십', '구십'];
        
        if (num === 0) return '영번';
        if (num > 99) return match; 
        
        const ten = Math.floor(num / 10);
        const unit = num % 10;
        
        let koNum = '';
        if (ten > 0) koNum += tens[ten];
        if (unit > 0) koNum += units[unit];
        
        return koNum + '번';
      });

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'ko-KR';
      utterance.rate = schoolConfig.ttsRate !== undefined ? schoolConfig.ttsRate : 0.75;
      
      // 긴급, 주의 등의 알림 키워드가 있으면 경고조로 피치를 높임
      if (textToSpeak.includes('긴급') || textToSpeak.includes('주의')) {
        utterance.pitch = 1.15;
      } else {
        utterance.pitch = 0.95; // 약간 차분한 톤으로 피치 조절
      }

      if (schoolConfig.ttsVoiceURI) {
        const voicesList = window.speechSynthesis.getVoices();
        const selectedVoice = voicesList.find(v => v.voiceURI === schoolConfig.ttsVoiceURI);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("TTS 재생 실패:", e);
    }
  };

  useEffect(() => {
    if (!db || viewMode !== 'classroom') return;

    const classKey = `${schoolConfig.currentGrade}-${schoolConfig.currentClass}`;
    const announceRef = ref(db, `announcements/${classKey}`);
    const globalAnnounceRef = ref(db, 'announcements/global');

    const handleSnapshot = (snapshot: any) => {
      const data = snapshot.val();
      const DEFAULT_MSG = '';
      
      if (data) {
        const incomingText = data.text ? data.text.trim() : '';
        
        if (isInitialSyncRef.current) {
          // 최초 로드 시 24시간이 지난 메시지면 빈 문자열로 무시
          const isExpired = Date.now() - (data.time || 0) > 24 * 60 * 60 * 1000;
          setAnnouncement(isExpired ? DEFAULT_MSG : incomingText);
          lastSyncTimeRef.current = data.time;
        } else if (data.time > lastSyncTimeRef.current) {
          lastSyncTimeRef.current = data.time;
          
          if (!incomingText) {
             setAnnouncement('');
             setIsPopupOpen(false);
             setPendingAnnouncements([]);
             try { localStorage.removeItem('pending_announcements_queue'); } catch(e) {}
             return;
          }

          if (data.duration) {
            setCurrentAnnouncementDuration(Number(data.duration));
          } else {
            setCurrentAnnouncementDuration(null);
          }
          
          const isForced = Boolean(data.forcePopup || schoolConfig.forcePopupDuringClass);

          if (isClassTime() && !isForced) {
            console.log("현재 수업 시간이므로 알림이 예약 대기열에 저장되었습니다. 쉬는 시간에 자동 표시됩니다.");
            setPendingAnnouncements(prev => {
              if (!prev.some(a => a.id === data.time.toString())) {
                const updated = [...prev, { id: data.time.toString(), text: incomingText, time: data.time, duration: data.duration }];
                try { localStorage.setItem('pending_announcements_queue', JSON.stringify(updated)); } catch(e) {}
                return updated;
              }
              return prev;
            });
            return;
          }

          const targetClassKey = `${schoolConfig.currentGrade}-${schoolConfig.currentClass}`;
          const currentTimeout = data.duration 
            || (classPopupTimeouts[targetClassKey] !== undefined ? classPopupTimeouts[targetClassKey] : (schoolConfig.popupTimeout || 60));
          
          setAnnouncement(incomingText);
          setIsPopupOpen(true);
          setIsExited(false);
          playNeonAlertSound(); 
          speakAnnouncementText(incomingText);
          
          if ((window as any).electron && (window as any).electron.ipcRenderer) {
            (window as any).electron.ipcRenderer.send('trigger-my-call', { timeout: currentTimeout });
          }
        }
      }
      isInitialSyncRef.current = false;
    };

    const unsubscribeLocal = onValue(announceRef, handleSnapshot);
    const unsubscribeGlobal = onValue(globalAnnounceRef, handleSnapshot);

    return () => {
      unsubscribeLocal();
      unsubscribeGlobal();
    };
  }, [viewMode, schoolConfig.currentGrade, schoolConfig.currentClass, dailySchedule, classPopupTimeouts, schoolConfig.popupTimeout, schoolConfig.forcePopupDuringClass]);

  useEffect(() => {
    const canPopupNow = !isClassTime() || schoolConfig.forcePopupDuringClass;
    if (pendingAnnouncements.length > 0 && viewMode === 'classroom' && canPopupNow && !isPopupOpen) {
      console.log("알림 표시 조건 충족 (쉬는 시간 또는 수업 중 강제 팝업 허용). 대기열의 알림을 표시합니다.");
      const nextAnnouncement = pendingAnnouncements[0];
      setPendingAnnouncements(prev => {
        const remaining = prev.slice(1);
        try { localStorage.setItem('pending_announcements_queue', JSON.stringify(remaining)); } catch(e) {}
        return remaining;
      });
      
      if (nextAnnouncement.duration) {
        setCurrentAnnouncementDuration(Number(nextAnnouncement.duration));
      } else {
        setCurrentAnnouncementDuration(null);
      }

      const targetClassKey = `${schoolConfig.currentGrade}-${schoolConfig.currentClass}`;
      const currentTimeout = nextAnnouncement.duration 
        || (classPopupTimeouts[targetClassKey] !== undefined ? classPopupTimeouts[targetClassKey] : (schoolConfig.popupTimeout || 60));

      setAnnouncement(nextAnnouncement.text);
      setIsPopupOpen(true);
      setIsExited(false);
      playNeonAlertSound();
      speakAnnouncementText(nextAnnouncement.text);
      
      if ((window as any).electron && (window as any).electron.ipcRenderer) {
        (window as any).electron.ipcRenderer.send('trigger-my-call', { timeout: currentTimeout });
      }
    }
  }, [currentTime, pendingAnnouncements, viewMode, isPopupOpen, classPopupTimeouts, schoolConfig.currentGrade, schoolConfig.currentClass, schoolConfig.popupTimeout, schoolConfig.forcePopupDuringClass]);

  const handleExitApp = () => {
    if ((window as any).electron && (window as any).electron.ipcRenderer) {
      (window as any).electron.ipcRenderer.send('hide-window');
      setIsExited(false); // 일렉트론 환경에서는 검은 대기 화면 대신 OS 창이 즉시 바탕화면으로 숨겨집니다.
    } else {
      try { window.close(); } catch(e) {}
      setIsExited(true);  
    }
  };

  const handleClosePopupAndHide = () => {
    setIsPopupOpen(false);
    handleExitApp();
  };

  useEffect(() => {
    if (isPopupOpen && viewMode === 'classroom') {
      const classKey = `${schoolConfig.currentGrade}-${schoolConfig.currentClass}`;
      const effectiveTimeout = currentAnnouncementDuration 
        || (classPopupTimeouts[classKey] !== undefined ? classPopupTimeouts[classKey] : (schoolConfig.popupTimeout || 60));
      
      setPopupCountdown(effectiveTimeout);

      if ((window as any).electron && (window as any).electron.ipcRenderer) {
        (window as any).electron.ipcRenderer.send('trigger-my-call', { timeout: effectiveTimeout });
      }

      const timeoutMs = effectiveTimeout * 1000;
      const timer = setTimeout(() => {
        handleClosePopupAndHide();
      }, timeoutMs);

      const interval = setInterval(() => {
        setPopupCountdown(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);

      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    } else {
      setPopupCountdown(null);
    }
  }, [isPopupOpen, viewMode, schoolConfig.popupTimeout, schoolConfig.currentGrade, schoolConfig.currentClass, classPopupTimeouts, currentAnnouncementDuration]);

  const dateString = `${currentTime.getMonth() + 1}월 ${currentTime.getDate()}일 ${['일', '월', '화', '수', '목', '금', '토'][currentTime.getDay()]}요일`;
  const timeString = currentTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  const formatScheduleString = (sch: { startH: string, startM: string, endH: string, endM: string }) => {
    if (!sch) return '';
    return `${sch.startH || '09'}:${sch.startM || '00'} - ${sch.endH || '10'}:${sch.endM || '00'}`;
  };

  const getSubjectIcon = (subject: string) => {
    if (!subject || subject === '-') return '📝';
    const s = subject.replace(/\s+/g, ''); 
    if (s.includes('국어') || s.includes('문학') || s.includes('화법') || s.includes('언어')) return '📜';
    if (s.includes('수학') || s.includes('미적분') || s.includes('기하') || s.includes('확률') || s.includes('통계')) return '📐';
    if (s.includes('영어') || s.includes('English') || s.includes('독해')) return '🔤';
    if (s.includes('프랑스어')) return '🗼';
    if (s.includes('일본어')) return '🌸';
    if (s.includes('중국어')) return '🐼';
    if (s.includes('외국어') || s.includes('회화')) return '🗣️';
    if (s.includes('물리') || s.includes('역학')) return '⚛️';
    if (s.includes('화학') || s.includes('물질대사') || s.includes('물질')) return '🧪';
    if (s.includes('생명') || s.includes('생물') || s.includes('세포와') || s.includes('세모와')) return '🧬';
    if (s.includes('지구과학') || s.includes('지구') || s.includes('우주') || s.includes('환경')) return '🌍';
    if (s.includes('과학')) return '🔬';
    if (s.includes('역사') || s.includes('한국사') || s.includes('세계사') || s.includes('동아시아')) return '🏛️';
    if (s.includes('사회') || s.includes('지리') || s.includes('경제') || s.includes('윤리') || s.includes('정치') || s.includes('법')) return '⚖️';
    if (s.includes('미술') || s.includes('드로잉') || s.includes('디자인') || s.includes('감상') || s.includes('매체')) return '🎨';
    if (s.includes('음악') || s.includes('합창') || s.includes('미디어')) return '🎵';
    if (s.includes('체육') || s.includes('스포츠') || s.includes('운동')) return '⚽';
    if (s.includes('정보') || s.includes('컴퓨터') || s.includes('코딩') || s.includes('프로그래밍')) return '💻';
    if (s.includes('기술') || s.includes('가정')) return '🏠';
    if (s.includes('진로') || s.includes('직업') || s.includes('창체') || s.includes('자율')) return '🧭';
    return '📚'; 
  };

  const handleModeSelect = (mode: 'classroom' | 'remote' | 'admin') => {
    if (mode === 'classroom' && (!schoolConfig.currentGrade || !schoolConfig.currentClass)) {
      if (schoolConfig) {
        const newConfig = { ...schoolConfig, currentGrade: schoolConfig.currentGrade || 1, currentClass: schoolConfig.currentClass || 1 };
        setSchoolConfig(newConfig);
        localStorage.setItem('school_config', JSON.stringify(newConfig));
      } else {
        alert('학년과 반을 먼저 선택해주세요.');
        return;
      }
    }
    if (rememberChoice) {
      localStorage.setItem('default_view_mode', mode);
    }
    setViewMode(mode);
  };

  const handleGoHome = () => {
    localStorage.removeItem('default_view_mode');
    setViewMode('select');
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinModal.input === schoolConfig.adminPin) {
      setTempClassRosters(classRosters);
      setTempDailySchedule(dailySchedule);
      setTempClassTimetables(classTimetables);
      setTempMeals(meals);
      setAdminSchoolName(schoolConfig.schoolName);
      setAdminGradeCounts(schoolConfig.gradeCounts);
      setAdminSelectedGrade(schoolConfig.currentGrade);
      setAdminSelectedClass(schoolConfig.currentClass);
      setAdminNeisApiKey(schoolConfig.neisApiKey);
      setAdminClassroomTheme(schoolConfig.classroomTheme || 'default');
      setAdminAppinServerUrl(schoolConfig.appinServerUrl || '');
      setAdminGeminiApiKey(schoolConfig.geminiApiKey || '');
      setAdminEduCode(schoolConfig.eduCode);
      setAdminSchoolCode(schoolConfig.schoolCode);
      setAdminPinInput(schoolConfig.adminPin);
      setAdminTtsVoiceURI(schoolConfig.ttsVoiceURI || '');
      setAdminTtsRate(schoolConfig.ttsRate !== undefined ? schoolConfig.ttsRate : 0.75);
      setAdminPopupTimeout(schoolConfig.popupTimeout !== undefined ? schoolConfig.popupTimeout : 60);
      setTempClassPopupTimeouts(classPopupTimeouts);
      setTempCustomCallPresets(customCallPresets);
      setEditTargetGrade(schoolConfig.currentGrade);
      setEditTargetClass(schoolConfig.currentClass);
      
      setPinModal({ isOpen: false, input: '', error: '' });
      handleModeSelect('admin');
    } else {
      setPinModal(prev => ({ ...prev, error: '비밀번호가 일치하지 않습니다.' }));
    }
  };

  const handleStudentCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const parsedMap: Record<string, string[]> = {};
      let totalCount = 0;
      lines.forEach((line, index) => {
        if (index === 0 || line.includes('학년') || line.includes('성명') || line.includes('번호')) return;
        const cols = line.split(',').map(c => c.trim().replace(/['"]+/g, ''));
        if (cols.length >= 4) {
          const grade = cols[0];
          const cls = cols[1];
          const num = cols[2];
          const name = cols[3];
          if (grade && cls && name) {
            const key = `${grade}-${cls}`;
            if (!parsedMap[key]) parsedMap[key] = [];
            const studentEntry = `${num}번 ${name}`;
            if (!parsedMap[key].includes(studentEntry)) {
              parsedMap[key].push(studentEntry);
              totalCount++;
            }
          }
        }
      });
      if (totalCount > 0) {
        setTempClassRosters(prev => ({ ...prev, ...parsedMap }));
        alert(`✅ CSV 파일에서 총 ${totalCount}명의 학생 명단을 덮어쓰기 완료했습니다!`);
      } else {
        alert('❌ 올바른 [학년, 반, 번호, 성명] 형식의 CSV 데이터가 아닙니다.');
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleNeisFetch = async (type: 'timetable' | 'meal') => {
    if (!schoolConfig.neisApiKey) {
      alert("❌ [오류] 관리자 모드의 [나이스(NEIS) 인증키 연동]에 API 키를 입력해주세요.");
      return;
    }
    setIsNeisLoading(true);
    try {
      if (type === 'timetable') {
        const url = `https://open.neis.go.kr/hub/hisTimetable?KEY=${schoolConfig.neisApiKey}&Type=json&ATPT_OFCDC_SC_CODE=${schoolConfig.eduCode}&SD_SCHUL_CODE=${schoolConfig.schoolCode}&GRADE=${editTargetGrade}&CLASS_NM=${editTargetClass}&ALL_TI_YMD=${adminDateKey}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.hisTimetable) {
          const rows = data.hisTimetable[1].row;
          const newTimetable: Record<number, string> = {};
          rows.forEach((row: any) => {
            let subject = row.ITRT_CNTNT || '';
            subject = subject.replace(/\*/g, '');
            subject = subject.replace(/\([^)]*\)/g, ''); // 괄호와 괄호 안 내용 모두 제거
            subject = subject.trim();
            newTimetable[row.PERIO] = subject;
          });
          const key = `${editTargetGrade}-${editTargetClass}`;
          
          setTempClassTimetables(prev => ({
            ...prev,
            [key]: {
              ...(prev[key] || {}),
              [adminDayOfWeek]: newTimetable
            }
          }));
          alert(`📡 [NEIS 연동 완료] 선택하신 요일의 학기 고정 시간표를 덮어썼습니다!`);
        } else {
          alert(`⚠ 해당 날짜의 시간표 데이터가 NEIS에 없습니다.`);
        }

      } else if (type === 'meal') {
        const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=${schoolConfig.neisApiKey}&Type=json&ATPT_OFCDC_SC_CODE=${schoolConfig.eduCode}&SD_SCHUL_CODE=${schoolConfig.schoolCode}&MLSV_YMD=${adminDateKey}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.mealServiceDietInfo) {
          const rows = data.mealServiceDietInfo[1].row;
          const newMeals = { lunch: ['급식 없음'], dinner: ['급식 없음'] };
          
          rows.forEach((row: any) => {
            const cleanedMenu = row.DDISH_NM.split('<br/>')
              .map((item: string) => item.replace(/\s*\([\d\.,\s]+\)/g, '').replace(/[\d\.]+\*?$/g, '').trim())
              .filter(Boolean);
            
            if (row.MMEAL_SC_CODE === '2') newMeals.lunch = cleanedMenu;     
            else if (row.MMEAL_SC_CODE === '3') newMeals.dinner = cleanedMenu; 
          });
          
          setTempMeals(prev => ({ ...prev, [adminDateKey]: newMeals }));
          alert(`📡 [NEIS 연동 완료] ${adminDate}의 급식을 가져왔습니다!`);
        } else {
          alert(`⚠ 해당 날짜의 급식 데이터가 NEIS에 없습니다.`);
        }
      }
    } catch (err) {
      console.log("Fetch error:", err.message);
      alert('❌ NEIS 연동 오류 발생');
    } finally {
      setIsNeisLoading(false);
    }
  };

  
  const handleFetchAppinServer = async () => {
    if (!adminAppinServerUrl) {
      alert("압핀 서버 주소(IP 등)를 입력해주세요.");
      return;
    }
    const apiKey = schoolConfig.geminiApiKey || schoolConfig.neisApiKey;
    if (!apiKey) {
      alert("❌ [API 키 필요] 관리자 모드에 Google Gemini API 키를 입력해주세요. (서버 HTML 분석용)");
      return;
    }
    setIsNeisLoading(true);
    try {
      let htmlText = "";
      // 자동 교정: 슬래시(/)를 콜론(:)으로 잘못 입력한 경우 포트 번호로 교정
      let formattedUrl = adminAppinServerUrl.trim();
      formattedUrl = formattedUrl.replace(/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/, '$1:$2');
      if (!formattedUrl.startsWith('http')) {
        formattedUrl = 'http://' + formattedUrl;
      }

      if ((window as any).electron?.ipcRenderer) {
        const res = await (window as any).electron.ipcRenderer.invoke('fetch-local-url', { url: formattedUrl });
        if (!res.success) throw new Error(res.error);
        htmlText = res.data;
      } else {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8초 타임아웃
        const res = await fetch(formattedUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        htmlText = await res.text();
      }

      if (!htmlText || htmlText.length < 100) {
        throw new Error("서버에서 유효한 데이터를 받지 못했습니다.");
      }

      // Send HTML to Gemini
      const promptText = `
너는 학교 시간표 분석 AI야. 다음은 학교 내부망 시간표 서버에서 가져온 HTML 소스코드야.
여기서 ${editTargetGrade}학년 ${editTargetClass}반의 이번 주(월~금요일), 1교시부터 7교시까지의 수업 과목을 전부 추출해줘.
[엄격한 추출 규칙]
1. 월요일은 "1", 화요일은 "2", 수요일은 "3", 목요일은 "4", 금요일은 "5" 를 최상위 키(key)로 사용해.
2. [가장 중요] 시간표 텍스트에 교사 이름(2~3글자 한글)이나 장소명(미술실, 강당 등)이 섞여있다면 100% 제거하고 오직 '순수 과목명'만 남겨.
3. 슬래시(/), 괄호(), 하이픈(-), 쉼표(,), 줄바꿈 등으로 구분된 텍스트는 교사/장소일 확률이 높으므로 완벽히 삭제해. (예: "진로활동/구민" -> "진로활동", "체육(박지성)" -> "체육")
4. 과목명과 교사명이 기호 없이 붙어있는 경우에도 의미를 유추해 사람 이름을 제거해. (예: "미적분I김교사" -> "미적분I")
5. 과목명 앞의 A, B, C, D 등 이동수업 알파벳을 완벽하게 제거해. (예: "C세포와물질대사" -> "세포와 물질대사")
6. 띄어쓰기를 예쁘게 교정해 (예: 독서와작문 -> 독서와 작문)
7. 빈칸은 "-" 로 표시해.
8. 반드시 마크다운 백틱 없이 순수 JSON 포맷으로만 응답해.

응답 예시:
{
  "1": { "1": "진로활동", "2": "독서와 작문", "3": "역학과 에너지", "4": "프랑스어 회화", "5": "세포와 물질대사", "6": "미술과 매체", "7": "미적분I" },
  "2": { "1": "독서와 작문", "2": "자율활동", "3": "스포츠 과학", "4": "미술과 매체", "5": "미적분I", "6": "영어II", "7": "미술 감상과 비평" },
  "3": { "1": "독서와 작문", "2": "프랑스어 회화", "3": "영어II", "4": "스포츠 과학", "5": "역학과 에너지", "6": "-", "7": "창체" },
  "4": { "1": "...", ... },
  "5": { "1": "...", ... }
}

HTML 소스코드:
${htmlText.substring(0, 30000)}
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { temperature: 0.1 }
        })
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error?.message || 'API 오류');

      let responseText = json.candidates[0].content.parts[0].text;
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

      const parsedObj = JSON.parse(responseText);
      const classKey = `${editTargetGrade}-${editTargetClass}`;
      setTempClassTimetables(prev => ({
        ...prev,
        [classKey]: parsedObj
      }));

      alert(`✅ 서버 접속 성공! ${editTargetGrade}학년 ${editTargetClass}반의 이번 주 시간표를 인공지능이 추출했습니다.`);
    } catch (err: any) {
      console.log("Fetch error:", err.message);
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        if ((window as any).electron?.ipcRenderer) {
          alert('❌ 서버 연동 실패 (시간 초과)\n압핀 서버(IP: ' + adminAppinServerUrl + ')가 응답하지 않습니다.\n\n1. 입력하신 IP가 올바른지 확인해주세요. (예: 10.123.45.67:1053)\n2. 해당 컴퓨터(서버)가 켜져 있고 압핀 프로그램이 실행 중인지 확인해주세요.');
        } else {
          alert('❌ 서버 연동 실패 (웹 브라우저 보안 및 시간 초과)\n입력하신 내부망 IP 주소로 접근할 수 없습니다.\n웹 브라우저에서는 내부망 IP 접근이 보안상 차단되므로 제공된 Electron PC 전용 앱을 설치하여 사용하셔야 합니다.');
        }
      } else if (err.message === 'Failed to fetch' || err.message.includes('fetch')) {
         if ((window as any).electron?.ipcRenderer) {
           alert('❌ 서버 연동 실패\n입력하신 압핀 서버(서랍장) 주소로 접속할 수 없거나, 구글 AI 서버 접속에 실패했습니다.\n1. 압핀 서버 IP 주소와 포트 번호가 올바른지 확인해주세요.\n2. 컴퓨터가 인터넷에 정상적으로 연결되어 있는지 확인해주세요.');
         } else {
           alert('❌ 서버 연동 실패 (Failed to fetch)\n웹 브라우저 보안 정책(CORS/Mixed Content)으로 인해 웹 환경에서는 로컬 내부망 IP 주소로 직접 접근할 수 없습니다.\n제공된 Electron PC 전용 앱을 설치하여 사용하시면 정상적으로 내부망 서버 연동이 가능합니다.');
         }
      } else {
         alert('❌ 서버 연동 실패: ' + (err.message || '입력하신 압핀 서버(IP) 주소가 잘못되었거나 서버가 꺼져있을 수 있습니다.'));
      }
    } finally {
      setIsNeisLoading(false);
    }
  };


  const handleTimetableImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        console.log("Fetch error:", err.message);
        alert('❌ 엑셀 파싱 중 오류가 발생했습니다.');
      } finally {
        setIsNeisLoading(false);
      }
      return;
    }

    const apiKey = schoolConfig.geminiApiKey || schoolConfig.neisApiKey;
    if (!apiKey) {
      alert("❌ [API 키 필요] 관리자 모드에 Google Gemini API 키를 입력해주세요.");
      e.target.value = '';
      return;
    }

    setTimetableFileName(file.name);
    setIsNeisLoading(true);

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const mimeType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      
      const month = currentTime.getMonth() + 1;
      const date = currentTime.getDate();
      const dayStr = ['일', '월', '화', '수', '목', '금', '토'][currentTime.getDay()];

      const promptText = `
너는 대한민국 학교 시간표 전문 OCR 분석기야.
첨부된 시간표 이미지에서 **월요일부터 금요일까지**의 1교시부터 7교시까지의 수업 과목을 전부 추출해.

[엄격한 추출 규칙]
1. 월요일은 "1", 화요일은 "2", 수요일은 "3", 목요일은 "4", 금요일은 "5" 를 최상위 키(key)로 사용해.
2. [가장 중요] 시간표 텍스트에 교사 이름(2~3글자 한글)이나 장소명(미술실, 강당 등)이 섞여있다면 100% 제거하고 오직 '순수 과목명'만 남겨.
3. 슬래시(/), 괄호(), 하이픈(-), 쉼표(,), 줄바꿈 등으로 구분된 텍스트는 교사/장소일 확률이 높으므로 완벽히 삭제해. (예: "진로활동/구민" -> "진로활동", "체육(박지성)" -> "체육")
4. 과목명과 교사명이 기호 없이 붙어있는 경우에도 의미를 유추해 사람 이름을 제거해. (예: "미적분I김교사" -> "미적분I")
5. 과목명 앞의 A, B, C, D 등 이동수업 알파벳을 완벽하게 제거해. (예: "C세포와물질대사" -> "세포와 물질대사")
6. 띄어쓰기를 예쁘게 교정해 (예: 독서와작문 -> 독서와 작문)
7. 빈칸은 "-" 로 표시해.
8. 반드시 마크다운 백틱 없이 순수 JSON 포맷으로만 응답해.

응답 예시:
{
  "1": { "1": "진로활동", "2": "독서와 작문", "3": "역학과 에너지", "4": "프랑스어 회화", "5": "세포와 물질대사", "6": "미술과 매체", "7": "미적분I" },
  "2": { "1": "독서와 작문", "2": "자율활동", "3": "스포츠 과학", "4": "미술과 매체", "5": "미적분I", "6": "영어II", "7": "미술 감상과 비평" },
  "3": { "1": "독서와 작문", "2": "프랑스어 회화", "3": "영어II", "4": "스포츠 과학", "5": "역학과 에너지", "6": "-", "7": "창체" }
}
`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }, { inlineData: { mimeType: file.type || 'image/jpeg', data: base64Data } }] }],
          generationConfig: { temperature: 0.1 }
        })
      });

      if (!response.ok) throw new Error('Gemini API 호출 실패');
      
      const result = await response.json();
      const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('JSON 변환 실패');

      const parsed = JSON.parse(jsonMatch[0]);
      const key = `${editTargetGrade}-${editTargetClass}`;
      
      const newTimetables = { ...tempClassTimetables };
      if (!newTimetables[key]) newTimetables[key] = {};
      
      let count = 0;
      for (const dateKey in parsed) {
        const cleanedDay: Record<number, string> = {};
        for(let i = 1; i <= 7; i++) {
          cleanedDay[i] = parsed[dateKey][i] || '-';
        }
        newTimetables[key][dateKey] = cleanedDay;
        count++;
      }

      setTempClassTimetables(newTimetables);
      alert(`✅ [${file.name}] 자동화 인식 성공!\n총 ${count}일 치 시간표 데이터가 달력에 자동 등록되었습니다.`);

    } catch (err: any) {
      console.log("Fetch error:", err.message);
      alert(`❌ 시간표 인식 실패: ${err.message}`);
    } finally {
      setIsNeisLoading(false);
      e.target.value = '';
    }
  };

  const handleMealFileupload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const apiKey = schoolConfig.geminiApiKey || schoolConfig.neisApiKey;
    if (!apiKey) {
      alert("❌ [API 키 필요] 관리자 모드에 Google Gemini API 키를 입력해주세요.");
      e.target.value = '';
      return;
    }

    setMealFileName(file.name);
    setIsNeisLoading(true);

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const promptText = `
너는 대한민국 학교 급식 식단표 전문 OCR 분석기야.
첨부된 문서에서 **모든 날짜(문서에 있는 한 달 치 전체)**의 '중식'과 '석식' 메뉴를 모조리 추출해줘.
현재 연도/월은 ${currentTime.getFullYear()}년 ${currentTime.getMonth() + 1}월이야.

[엄격한 추출 규칙]
1. 날짜를 파악하여 "YYYYMMDD" (예: "20260828") 형태를 키(key)로 사용할 것.
2. (1.5.6) 같은 알레르기 유발물질 번호 괄호는 전부 제거할 것.
3. 칼로리 및 영양 정보 제외, 오직 음식 명칭만 추출.
4. 빈 배열은 []
5. 마크다운 없이 순수 JSON 포맷으로 응답할 것.
형식 예시:
{
  "20260827": { "lunch": ["메뉴1", "메뉴2"], "dinner": [] },
  "20260828": { "lunch": ["메뉴1", "메뉴2"], "dinner": ["메뉴3"] }
}
`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }, { inlineData: { mimeType: file.type || 'image/jpeg', data: base64Data } }] }],
          generationConfig: { temperature: 0.1 }
        })
      });

      if (!response.ok) throw new Error('Gemini API 호출 실패');

      const result = await response.json();
      const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('JSON 변환 실패');

      const parsed = JSON.parse(jsonMatch[0]);
      const newMeals = { ...tempMeals };
      
      let count = 0;
      for (const dateKey in parsed) {
        newMeals[dateKey] = {
          lunch: (parsed[dateKey].lunch && parsed[dateKey].lunch.length > 0 ? parsed[dateKey].lunch : ['급식 없음'])
            .map((item: string) => item.replace(/\s*\([\d\.,\s]+\)/g, '').trim()),
          dinner: (parsed[dateKey].dinner && parsed[dateKey].dinner.length > 0 ? parsed[dateKey].dinner : ['급식 없음'])
            .map((item: string) => item.replace(/\s*\([\d\.,\s]+\)/g, '').trim())
        };
        count++;
      }

      setTempMeals(newMeals);
      alert(`✅ [${file.name}] 자동화 인식 성공!\n총 ${count}일 치 식단 데이터가 달력에 자동 등록되었습니다.`);

    } catch (err: any) {
      console.log("Fetch error:", err.message);
      alert(`❌ 식단표 인식 실패: ${err.message}`);
    } finally {
      setIsNeisLoading(false);
      e.target.value = '';
    }
  };

  const sendFirebaseMessage = (msg: string, isGlobal = false, customDuration?: number, forcePopupOverride?: boolean) => {
    const classKey = `${schoolConfig.currentGrade}-${schoolConfig.currentClass}`;
    const effectiveTimeout = customDuration 
      || (classPopupTimeouts[classKey] !== undefined ? classPopupTimeouts[classKey] : (schoolConfig.popupTimeout || 60));
    const shouldForce = forcePopupOverride !== undefined ? forcePopupOverride : isForcePopupSend;

    if (!db) {
      alert("❌ Firebase가 연결되지 않아 로컬에만 저장됩니다.");
      localStorage.setItem('class_announcement', msg);
      setAnnouncement(msg);
      setCurrentAnnouncementDuration(effectiveTimeout);
      setSendSuccessToast(true);
      setTimeout(() => setSendSuccessToast(false), 3000);
      return;
    }

    const targetPath = isGlobal ? 'announcements/global' : `announcements/${schoolConfig.currentGrade}-${schoolConfig.currentClass}`;
    set(ref(db, targetPath), {
      text: msg,
      time: Date.now(),
      duration: effectiveTimeout,
      forcePopup: shouldForce
    }).then(() => {
      setSendSuccessToast(true);
      setTimeout(() => setSendSuccessToast(false), 3000);
    }).catch(e => {
      console.error(e);
      alert("❌ 전송 실패: " + e.message);
    });
  };

  const handleSendSmartCall = (e: React.FormEvent) => {
    e.preventDefault();
    const actualMessage = selectedCallMessage === '직접 입력' ? customAnnouncement.trim() : selectedCallMessage;
    if (!actualMessage) {
      alert("호출 메시지를 입력해주세요.");
      return;
    }

    const targetLabel = isGlobalSend ? '전체 교실' : `${schoolConfig.currentGrade}학년 ${schoolConfig.currentClass}반`;
    if (!window.confirm(`[확인] ${targetLabel}에 호출 메시지를 전송하시겠습니까?`)) {
      return;
    }

    const targetStr = selectedStudent.length > 0 ? selectedStudent.join(', ') : '학급 전체';
    const teacherStr = teacherName.trim() ? `\n(${teacherName.trim()} 선생님 호출)` : '';
    const finalMsg = `[대상: ${targetStr}]\n호출 내용: ${actualMessage}\n장소: ${locationName}${teacherStr}`;
    sendFirebaseMessage(finalMsg, isGlobalSend);
  };

  const handleSendClassAnnouncement = () => {
    if (!customAnnouncement.trim()) {
      alert('내용을 입력해주세요.');
      return;
    }

    const targetLabel = isGlobalSend ? '전체 교실' : `${schoolConfig.currentGrade}학년 ${schoolConfig.currentClass}반`;
    if (!window.confirm(`[확인] ${targetLabel}에 이 메시지를 전송하시겠습니까?`)) {
      return;
    }

    sendFirebaseMessage(customAnnouncement.trim(), isGlobalSend);
  };

  const handleResetClassAnnouncement = () => {
    setCustomAnnouncement('');
    sendFirebaseMessage('', isGlobalSend);
  };

  const handleToggleForcePopupDuringClass = (val: boolean) => {
    setAdminForcePopupDuringClass(val);
    setSchoolConfig(prev => {
      const updated = { ...prev, forcePopupDuringClass: val };
      try { localStorage.setItem('school_config', JSON.stringify(updated)); } catch(e) {}
      return updated;
    });

    if (db) {
      import("firebase/database").then(({ ref: dbRef, update }) => {
        update(dbRef(db, 'globalData/schoolConfig'), { forcePopupDuringClass: val }).catch(console.error);
      });
    }
  };

  // 💡 [핵심 수정] Quota Exceeded (용량 초과) 방지 및 자동 복구 로직 추가
  const handleSaveAdminSettings = () => {
    const newConfig = { 
      schoolName: adminSchoolName.trim() || '학교명', 
      gradeCounts: adminGradeCounts,
      currentGrade: adminSelectedGrade,
      currentClass: adminSelectedClass,
      neisApiKey: adminNeisApiKey.trim(),
      geminiApiKey: adminGeminiApiKey.trim(),
      eduCode: adminEduCode.trim(),
      schoolCode: adminSchoolCode.trim(),
      adminPin: adminPinInput.trim() || '0000',
      ttsVoiceURI: adminTtsVoiceURI,
      ttsRate: adminTtsRate,
      popupTimeout: adminPopupTimeout,
      forcePopupDuringClass: adminForcePopupDuringClass,
      classroomTheme: adminClassroomTheme,
      appinServerUrl: adminAppinServerUrl
    };
    
    setSchoolConfig(newConfig);
    setClassRosters(tempClassRosters);
    setDailySchedule(tempDailySchedule);
    setClassTimetables(tempClassTimetables);
    setMeals(tempMeals);
    setClassPopupTimeouts(tempClassPopupTimeouts);
    setCustomCallPresets(tempCustomCallPresets);
    try { localStorage.setItem('custom_call_presets', JSON.stringify(tempCustomCallPresets)); } catch(e) {}

    if (db) {
      const cleanData = JSON.parse(JSON.stringify({
        schoolConfig: newConfig,
        classRosters: tempClassRosters,
        dailySchedule: tempDailySchedule,
        classTimetables: tempClassTimetables,
        classPopupTimeouts: tempClassPopupTimeouts,
        timetableDetails: timetableDetails,
        meals: tempMeals,
        customCallPresets: tempCustomCallPresets
      }));

      set(ref(db, 'globalData'), cleanData).catch(e => {
        console.warn('Firebase 백그라운드 동기화 실패:', e);
      });
    }

    const safeSave = (key: string, value: any) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (err: any) {
        if (err?.name === 'QuotaExceededError' || err?.message?.includes('quota') || err?.message?.includes('Storage')) {
          console.warn(`저장소 용량 초과로 인해 ${key} 데이터를 무시하고 계속 진행합니다.`);
          localStorage.removeItem(key);
        } else {
          throw err;
        }
      }
    };

    try {
      safeSave('school_config', newConfig);
      safeSave('class_rosters_map', tempClassRosters);
      safeSave('daily_schedule', tempDailySchedule);
      safeSave('class_timetables_map', tempClassTimetables);
      safeSave('meal_data', tempMeals);
      safeSave('class_popup_timeouts', tempClassPopupTimeouts);
      
      setSaveSuccessToast(true);
      setTimeout(() => setSaveSuccessToast(false), 3000);
    } catch (err: any) {
      console.error("저장 에러:", err);
      alert('❌ 로컬 저장 중 알 수 없는 오류가 발생했습니다.');
    }
  };

  const hoursList = Array.from({ length: 13 }, (_, i) => String(i + 8).padStart(2, '0'));
  const minutesList = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  if (viewMode === 'select') {
    return (
      <div 
        className="h-screen w-full bg-[#162d22] text-white flex flex-col items-center justify-center p-6 select-none overflow-y-auto relative"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        <button 
          onClick={() => window.close()} 
          className="absolute top-6 right-6 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors z-50 cursor-pointer"
          style={{ WebkitAppRegion: 'no-drag' } as any}
          title="종료"
        >
          <X size={24} />
        </button>

        <div className="max-w-4xl w-full text-center space-y-12 my-auto pt-16 relative z-10" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <div className="space-y-4">
            <div className="inline-block px-5 py-2 rounded-full bg-emerald-900/80 text-emerald-300 text-xs font-bold border border-emerald-600/60 shadow-md">
              {schoolConfig.schoolName} <span className="text-[11px] font-mono text-emerald-400/90 ml-1.5 font-bold">({APP_VERSION})</span>{renderUpdateBadge()}
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white drop-shadow-lg">
              {appEnvMode === 'office' ? '교무실 스마트 제어 시스템' : '학급 알림판 & 스마트 제어 시스템'}
            </h1>
            <p className="text-emerald-300/80 text-sm">사용하실 모드를 선택해 주세요.</p>
          </div>
          <div className="max-w-2xl mx-auto space-y-6 pt-4">
            <div className={`grid grid-cols-1 ${appEnvMode === 'all' ? 'md:grid-cols-2 max-w-none' : 'max-w-sm'} gap-6 mx-auto`}>
              {(appEnvMode === 'all' || appEnvMode === 'class') && (
              <div className="bg-[#1e382b] border-2 border-emerald-700/60 rounded-3xl p-8 flex flex-col items-center text-center shadow-xl relative group hover:-translate-y-1 transition-transform h-full">
                <div className="w-16 h-16 rounded-2xl bg-emerald-900/80 flex items-center justify-center text-emerald-300 mb-6 shadow-inner">
                  <Monitor size={36} />
                </div>
                <h2 className="text-xl font-bold text-white mb-2 break-keep">교실 화면 (알림판)</h2>
                <p className="text-xs text-emerald-300/70 leading-relaxed mb-8 break-keep">
                  아이들을 위해 전자칠판에 띄워둘 실시간<br/>시간표 및 급식 대시보드입니다.
                </p>
                
                <div className="mt-auto w-full space-y-3">
                  <div className="flex gap-2 w-full">
                    <select 
                      value={schoolConfig.currentGrade}
                      onChange={(e) => {
                        const newConfig = { ...schoolConfig, currentGrade: Number(e.target.value) };
                        setSchoolConfig(newConfig);
                        localStorage.setItem('school_config', JSON.stringify(newConfig));
                      }}
                      className="flex-1 bg-[#111a15] text-white text-xs px-2 py-2.5 rounded-xl border border-emerald-700/50 outline-none focus:border-emerald-400 cursor-pointer text-center"
                    >
                      <option value={0} disabled>학년</option>
                      {[1, 2, 3].map(g => <option key={g} value={g}>{g}학년</option>)}
                    </select>
                    <select 
                      value={schoolConfig.currentClass}
                      onChange={(e) => {
                        const newConfig = { ...schoolConfig, currentClass: Number(e.target.value) };
                        setSchoolConfig(newConfig);
                        localStorage.setItem('school_config', JSON.stringify(newConfig));
                      }}
                      className="flex-1 bg-[#111a15] text-white text-xs px-2 py-2.5 rounded-xl border border-emerald-700/50 outline-none focus:border-emerald-400 cursor-pointer text-center"
                    >
                      <option value={0} disabled>반</option>
                      {Array.from({ length: schoolConfig.gradeCounts[schoolConfig.currentGrade as 1|2|3] || 8 }, (_, i) => i + 1).map(c => <option key={c} value={c}>{c}반</option>)}
                    </select>
                  </div>
                  <button 
                    onClick={() => handleModeSelect('classroom')}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <Monitor size={16} /> 화면 띄우기
                  </button>
                </div>
              </div>
              )}
              
              {(appEnvMode === 'all' || appEnvMode === 'office') && (
              <button 
                onClick={() => handleModeSelect('remote')}
                className="group bg-[#1e382b] hover:bg-[#254636] border-2 border-emerald-700/60 hover:border-emerald-400 rounded-3xl p-8 flex flex-col items-center text-center transition-all shadow-xl cursor-pointer hover:-translate-y-1 h-full"
              >
                <div className="w-16 h-16 rounded-2xl bg-amber-900/80 flex items-center justify-center text-amber-300 mb-6 group-hover:scale-110 transition-transform shadow-inner">
                  <Smartphone size={36} />
                </div>
                <h2 className="text-xl font-bold text-white mb-2 break-keep">교사용 리모컨 모드</h2>
                <p className="text-xs text-amber-200/70 leading-relaxed mt-1 mb-auto break-keep">
                  학생들을 호출하고 공지사항을<br/>전자칠판으로 즉시 전송하는 조종 패널입니다.
                </p>
              </button>
              )}


            </div>

            {(appEnvMode === 'all' || appEnvMode === 'office') && (
            <div className="flex justify-center mt-6">
              <button 
                onClick={() => setPinModal({ isOpen: true, input: '', error: '' })}
                className="group bg-[#1e382b]/80 hover:bg-[#254636] border border-emerald-700/40 hover:border-emerald-400/80 rounded-2xl px-6 py-4 flex items-center gap-4 transition-all shadow-md cursor-pointer hover:-translate-y-0.5"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-900/60 flex items-center justify-center text-indigo-300 group-hover:scale-110 transition-transform shadow-inner">
                  <Wrench size={20} />
                </div>
                <div className="text-left">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    관리자 모드 <Lock size={12} className="text-emerald-500/50" />
                  </h2>
                  <p className="text-[10px] text-indigo-200/60 mt-0.5">명단 업로드, NEIS 연동 및 보안 설정</p>
                </div>
              </button>
            </div>
            )}
          </div>
          <div className="flex items-center justify-center gap-3 pt-6 border-t border-emerald-900/40">
            <input 
              type="checkbox" 
              id="remember" 
              checked={rememberChoice} 
              onChange={e => setRememberChoice(e.target.checked)} 
              className="w-4 h-4 cursor-pointer accent-emerald-500" 
            />
            <label htmlFor="remember" className="text-sm font-bold text-emerald-300 cursor-pointer select-none">
              다음부터 이 기기에서는 선택한 모드로 바로 시작하기 (전자칠판/스마트폰 고정용)
            </label>
          </div>
        </div>

        

        {pinModal.isOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1a1a] border-2 border-indigo-500/50 p-8 rounded-3xl w-full max-w-sm text-center shadow-2xl animate-fade-in">
              <div className="mx-auto w-12 h-12 bg-indigo-900/80 rounded-full flex items-center justify-center text-indigo-300 mb-4">
                <Lock size={24} />
              </div>
              <h3 className="text-xl font-black text-white mb-2">관리자 인증</h3>
              <p className="text-xs text-slate-400 mb-6">시스템 설정을 위해 관리자 비밀번호를 입력해주세요.</p>
              
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <input 
                  type="password" 
                  autoFocus
                  maxLength={4}
                  value={pinModal.input}
                  onChange={(e) => setPinModal({ ...pinModal, input: e.target.value.replace(/\D/g, ''), error: '' })}
                  placeholder="PIN 번호 4자리"
                  className="w-full text-center tracking-[1em] font-mono text-2xl px-4 py-4 bg-[#111] text-white rounded-xl border border-indigo-900 outline-none focus:border-indigo-400"
                />
                {pinModal.error && <p className="text-xs text-rose-500 font-bold">{pinModal.error}</p>}
                
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setPinModal({ isOpen: false, input: '', error: '' })} className="flex-1 py-3 bg-[#222] hover:bg-[#333] text-white rounded-xl text-sm font-bold transition-colors">취소</button>
                  <button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-colors shadow-lg">확인</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (viewMode === 'remote') {
    return (
      <div className="h-screen w-full bg-[#111111] text-white flex flex-col select-none overflow-y-auto" style={{ WebkitAppRegion: "drag" } as any}>
        <header className="h-16 px-6 bg-[#161616] border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={handleGoHome} style={{ WebkitAppRegion: "no-drag" } as any} className="p-2 rounded-xl bg-white/10 text-emerald-300 hover:bg-white/20 cursor-pointer flex items-center gap-1 text-xs font-bold" title="홈 화면으로 이동 및 고정 해제">
              <ArrowLeft size={16} /> 홈으로 (고정 해제)
            </button>
            <h1 className="text-lg font-bold text-amber-400 flex items-center gap-2">
              📱 {schoolConfig.currentGrade}학년 {schoolConfig.currentClass}반 스마트 리모컨 <span className="text-xs font-mono bg-black/50 text-amber-400/80 px-2 py-0.5 rounded border border-white/10 font-normal">{APP_VERSION}</span>{renderUpdateBadge()}
            </h1>
          </div>
          <div className="text-xs text-emerald-400 font-mono">{timeString}</div>
        </header>

        <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-8 pb-12" style={{ WebkitAppRegion: "no-drag" } as any}>
          
          <section className="grid grid-cols-2 gap-4">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 space-y-2">
              <label className="text-[11px] font-bold text-slate-400 tracking-wider">학년</label>
              <select 
                value={schoolConfig.currentGrade}
                onChange={(e) => setSchoolConfig({ ...schoolConfig, currentGrade: Number(e.target.value) })}
                className="w-full bg-[#111] border border-white/20 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-amber-400"
              >
                {[1, 2, 3].map(g => <option key={g} value={g}>{g}학년</option>)}
              </select>
            </div>

            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 space-y-2">
              <label className="text-[11px] font-bold text-slate-400 tracking-wider">반</label>
              <select 
                value={schoolConfig.currentClass}
                onChange={(e) => setSchoolConfig({ ...schoolConfig, currentClass: Number(e.target.value) })}
                className="w-full bg-[#111] border border-white/20 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-amber-400"
              >
                {Array.from({ length: schoolConfig.gradeCounts[schoolConfig.currentGrade as 1 | 2 | 3] || 8 }, (_, i) => i + 1).map(c => <option key={c} value={c}>{c}반</option>)}
              </select>
            </div>
          </section>

          <section className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amber-400" />
              <span className="text-xs font-bold text-slate-300">
                {schoolConfig.currentGrade}학년 {schoolConfig.currentClass}반 화면 표시 유지 시간:
              </span>
              <span className="text-xs font-mono font-black text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded">
                {classPopupTimeouts[`${schoolConfig.currentGrade}-${schoolConfig.currentClass}`] !== undefined 
                  ? `${classPopupTimeouts[`${schoolConfig.currentGrade}-${schoolConfig.currentClass}`]}초` 
                  : `${schoolConfig.popupTimeout || 60}초 (기본)`}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[15, 30, 60, 90, 120].map(sec => {
                const curVal = classPopupTimeouts[`${schoolConfig.currentGrade}-${schoolConfig.currentClass}`] !== undefined
                  ? classPopupTimeouts[`${schoolConfig.currentGrade}-${schoolConfig.currentClass}`]
                  : (schoolConfig.popupTimeout || 60);
                const isSelected = curVal === sec;
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => {
                      const key = `${schoolConfig.currentGrade}-${schoolConfig.currentClass}`;
                      const newTimeouts = { ...classPopupTimeouts, [key]: sec };
                      setClassPopupTimeouts(newTimeouts);
                      try { localStorage.setItem('class_popup_timeouts', JSON.stringify(newTimeouts)); } catch(e) {}
                      if (db) {
                        set(ref(db, 'globalData/classPopupTimeouts'), newTimeouts).catch(console.error);
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${isSelected ? 'bg-amber-500 text-black shadow-md font-black' : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'}`}
                  >
                    {sec}초
                  </button>
                );
              })}
            </div>
          </section>

          <section className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-400 tracking-wider">학생 선택 ({schoolConfig.currentGrade}학년 {schoolConfig.currentClass}반 학생 명렬 - 총 {currentStudents.length}명)</label>
              <span className="text-xs text-amber-400 font-bold">{selectedStudent.length > 0 ? selectedStudent.join(', ') : '전체 선택됨'} <span className="text-slate-400 ml-1 font-normal">(다중 선택 가능)</span></span>
            </div>
            
            {currentStudents.length > 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 overflow-y-visible pr-1">
                {currentStudents.map((stu, i) => {
                  const isSelected = selectedStudent.includes(stu);
                  return (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setSelectedStudent(prev => prev.includes(stu) ? prev.filter(s => s !== stu) : [...prev, stu])}
                      className={`py-3 px-2 rounded-2xl text-xs font-bold transition-all border cursor-pointer truncate ${isSelected ? 'bg-rose-600 text-white border-rose-500 shadow-lg scale-105' : 'bg-[#222] text-slate-300 border-white/10 hover:bg-[#2a2a2a]'}`}
                    >
                      {stu}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-slate-500 bg-[#111] rounded-2xl border border-white/5">등록된 학생이 없습니다. 관리자 모드에서 설정해주세요.</div>
            )}
          </section>

          <section className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 space-y-3">
            <label className="text-xs font-bold text-slate-400 tracking-wider">호출 메시지</label>
                        <div className="space-y-2">
              {[...customCallPresets, '직접 입력'].map((msg) => {
                const isSelected = selectedCallMessage === msg;
                return (
                  <div
                    key={msg}
                    onClick={() => setSelectedCallMessage(msg)}
                    className={`w-full p-4 rounded-2xl text-sm font-bold border transition-all cursor-pointer flex items-center justify-between ${isSelected ? 'bg-[#251515] border-rose-500 text-rose-400 shadow-md' : 'bg-[#161616] border-white/10 text-slate-300 hover:bg-[#222]'}`}
                  >
                    {msg}
                    {isSelected && <CheckCircle2 size={18} className="text-rose-400" />}
                  </div>
                );
              })}
              {selectedCallMessage === '직접 입력' && (
                <textarea
                  value={customAnnouncement}
                  onChange={e => setCustomAnnouncement(e.target.value)}
                  placeholder="직접 전달할 메시지를 자유롭게 입력하세요... (줄바꿈 지원)"
                  className="w-full h-32 bg-[#111] border border-rose-900/50 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-rose-500 resize-none mt-4 leading-relaxed"
                />
              )}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-4">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 space-y-3 flex flex-col justify-center">
              <label className="text-xs font-bold text-slate-400 tracking-wider">호출 장소</label>
              <input 
                type="text" 
                value={locationName}
                onChange={e => setLocationName(e.target.value)}
                placeholder="예: 본교무실"
                className="w-full bg-[#111] border border-white/20 rounded-xl px-4 py-4 text-sm font-bold text-white outline-none focus:border-amber-400"
              />
            </div>
            
            <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 space-y-3 flex flex-col justify-center">
              <label className="text-xs font-bold text-slate-400 tracking-wider">호출 교사</label>
              <input 
                type="text" 
                value={teacherName}
                onChange={e => setTeacherName(e.target.value)}
                placeholder="예: 홍길동"
                className="w-full bg-[#111] border border-white/20 rounded-xl px-4 py-4 text-sm font-bold text-white outline-none focus:border-amber-400"
              />
            </div>
          </section>

          <form onSubmit={handleSendSmartCall} className="pt-4">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <label className="flex items-center gap-2 cursor-pointer text-amber-400 bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-500/30 hover:bg-amber-900/40 transition-colors">
                <input type="checkbox" checked={isForcePopupSend} onChange={e => setIsForcePopupSend(e.target.checked)} className="w-4 h-4 accent-amber-500 cursor-pointer" />
                <span className="text-xs font-bold flex items-center gap-1">⚡ 수업 중 즉시 강제 팝업 (대기열 무시)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-rose-400 bg-rose-950/40 px-3 py-1.5 rounded-xl border border-rose-500/30 hover:bg-rose-900/40 transition-colors">
                <input type="checkbox" checked={isGlobalSend} onChange={e => setIsGlobalSend(e.target.checked)} className="w-4 h-4 accent-rose-500 cursor-pointer" />
                <span className="text-xs font-bold">전체 교실로 전송</span>
              </label>
            </div>
            <button 
              type="submit"
              disabled={!selectedCallMessage || !locationName}
              className="w-full py-5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-2xl shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all text-lg flex items-center justify-center gap-3 active:scale-95 cursor-pointer"
            >
              <Send size={24} /> 스마트 리모컨 호출 전송
            </button>
          </form>

          <div className="my-8 flex items-center gap-4">
            <div className="h-px bg-white/10 flex-1"></div>
            <span className="text-xs font-bold text-slate-500 tracking-widest">OR</span>
            <div className="h-px bg-white/10 flex-1"></div>
          </div>

          <section className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold text-slate-400 tracking-wider flex items-center gap-2"><Edit3 size={14}/> 직접 입력 호출 메시지</label>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer text-amber-400 bg-amber-950/40 px-3 py-1 rounded-xl border border-amber-500/30 hover:bg-amber-900/40 transition-colors">
                  <input type="checkbox" checked={isForcePopupSend} onChange={e => setIsForcePopupSend(e.target.checked)} className="w-4 h-4 accent-amber-500 cursor-pointer" />
                  <span className="text-xs font-bold flex items-center gap-1">⚡ 수업 중 즉시 강제 팝업</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-xl border border-emerald-500/30 hover:bg-emerald-900/40 transition-colors">
                  <input type="checkbox" checked={isGlobalSend} onChange={e => setIsGlobalSend(e.target.checked)} className="w-4 h-4 accent-emerald-500 cursor-pointer" />
                  <span className="text-xs font-bold">전체 교실로 전송</span>
                </label>
              </div>
            </div>
            <textarea 
              value={customAnnouncement}
              onChange={e => setCustomAnnouncement(e.target.value)}
              placeholder="직접 전달할 메시지를 자유롭게 입력하세요..."
              className="w-full h-32 bg-[#111] border border-white/20 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-emerald-400 resize-none leading-relaxed"
            />
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={handleResetClassAnnouncement}
                className="px-6 py-4 bg-[#222] hover:bg-[#333] text-slate-300 font-bold rounded-xl transition-colors text-sm cursor-pointer"
              >
                초기화
              </button>
              <button 
                type="button"
                onClick={handleSendClassAnnouncement}
                className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-[0_0_15px_rgba(5,150,105,0.4)] transition-all text-sm flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                <Send size={18} /> 메시지 직접 전송
              </button>
            </div>
          </section>
        
          <section className="bg-[#1a1a1a] border border-blue-900/40 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <Clock size={18} />
              <h2 className="font-bold text-sm">교시별 일과시간 설정 (전체 공통 적용)</h2>
            </div>
            <p className="text-xs text-slate-400 mb-4 break-keep">
              단축수업 등 오늘 하루 특별한 일과가 있다면 여기서 시간을 변경할 수 있습니다. 변경 시 즉시 모든 전자칠판에 반영됩니다.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4, 5, 6, 7].map((p) => {
                const sch = dailySchedule?.[p] || { startH: '09', startM: '00', endH: '10', endM: '00' };
                return (
                  <div key={p} className="bg-[#111] p-3 rounded-xl border border-white/5 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-blue-400 w-16">{p}교시</span>
                    
                    <div className="flex items-center gap-1">
                      <select 
                        value={sch.startH}
                        onChange={(e) => {
                          const newSchedule = {...dailySchedule, [p]: {...sch, startH: e.target.value}};
                          setDailySchedule(newSchedule);
                        }}
                        className="bg-transparent text-white border-b border-blue-900/50 text-xs py-1 outline-none"
                      >
                        {hoursList.map(h => <option key={h} value={h} className="bg-[#111]">{h}</option>)}
                      </select>
                      <span>:</span>
                      <select 
                        value={sch.startM}
                        onChange={(e) => {
                          const newSchedule = {...dailySchedule, [p]: {...sch, startM: e.target.value}};
                          setDailySchedule(newSchedule);
                        }}
                        className="bg-transparent text-white border-b border-blue-900/50 text-xs py-1 outline-none"
                      >
                        {minutesList.map(m => <option key={m} value={m} className="bg-[#111]">{m}</option>)}
                      </select>
                    </div>
                    <span className="text-xs text-blue-600">-</span>
                    <div className="flex items-center gap-1">
                      <select 
                        value={sch.endH}
                        onChange={(e) => {
                          const newSchedule = {...dailySchedule, [p]: {...sch, endH: e.target.value}};
                          setDailySchedule(newSchedule);
                        }}
                        className="bg-transparent text-white border-b border-blue-900/50 text-xs py-1 outline-none"
                      >
                        {hoursList.map(h => <option key={h} value={h} className="bg-[#111]">{h}</option>)}
                      </select>
                      <span>:</span>
                      <select 
                        value={sch.endM}
                        onChange={(e) => {
                          const newSchedule = {...dailySchedule, [p]: {...sch, endM: e.target.value}};
                          setDailySchedule(newSchedule);
                        }}
                        className="bg-transparent text-white border-b border-blue-900/50 text-xs py-1 outline-none"
                      >
                        {minutesList.map(m => <option key={m} value={m} className="bg-[#111]">{m}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex justify-end">
              <button 
                onClick={() => {
                  try { localStorage.setItem('daily_schedule', JSON.stringify(dailySchedule)); } catch(e) {}
                  if (db) {
                    import("firebase/database").then(({ ref: dbRef, set }) => {
                      set(dbRef(db, 'globalData/dailySchedule'), dailySchedule).then(() => {
                        setMemoSuccessToast(true);
                        setTimeout(() => setMemoSuccessToast(false), 3000);
                      }).catch(console.error);
                    });
                  } else {
                    setMemoSuccessToast(true);
                    setTimeout(() => setMemoSuccessToast(false), 3000);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <Send size={18} />
                일과시간 전체 반영 (저장)
              </button>
            </div>
          </section>

          <section className="bg-[#1a1a1a] border border-amber-900/40 rounded-3xl p-6 space-y-4 relative z-0">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-2 text-amber-400">
                <Calendar size={18} />
                <h2 className="font-bold text-sm">시간표 알림장 / 이동수업 장소 메모 입력</h2>
              </div>
              <div className="flex items-center gap-1.5 bg-[#111] p-1 rounded-xl border border-white/10">
                {[
                  { day: '1', label: '월' },
                  { day: '2', label: '화' },
                  { day: '3', label: '수' },
                  { day: '4', label: '목' },
                  { day: '5', label: '금' },
                ].map(({ day, label }) => {
                  const isSelected = remoteDayOfWeek === day;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setRemoteDayOfWeek(day)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${isSelected ? 'bg-amber-500 text-black shadow font-black' : 'text-slate-400 hover:text-white'}`}
                    >
                      {label}요일
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-4 break-keep">
              선택한 요일의 각 교시별 장소와 알림 메모를 입력하면 전자칠판 시간표 카드에 실시간으로 표시됩니다.
            </p>
            
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 7].map(period => {
                const todayKey = `${schoolConfig.currentGrade}-${schoolConfig.currentClass}`;
                const subjectVal = classTimetables[todayKey]?.[remoteDayOfWeek]?.[period]
                  || classTimetables[todayKey]?.['1']?.[period];
                const displaySubject = (subjectVal && subjectVal !== '-') ? subjectVal : '과목 미지정';
                
                const detailKey = `${todayKey}-${remoteDayOfWeek}-${period}`;
                const detail = timetableDetails[detailKey] || timetableDetails[`${todayKey}-${period}`] || { location: '', memo: '' };
                
                return (
                  <div key={period} className="flex flex-col md:flex-row gap-3 bg-[#111] p-3 rounded-xl border border-white/5 relative z-0">
                    <div className="flex items-center gap-2 w-full md:w-36 shrink-0">
                      <span className="text-amber-500 font-black text-sm">{period}교시</span>
                      <span className={`text-xs font-bold truncate ${displaySubject === '과목 미지정' ? 'text-slate-500' : 'text-white'}`}>{displaySubject}</span>
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 relative z-0">
                      <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-lg px-3 border border-white/10 focus-within:border-amber-500/50">
                        <MapPin size={12} className="text-slate-500 shrink-0"/>
                        <input
                          type="text"
                          placeholder="장소 (예: 과학실, 체육관)"
                          value={detail.location}
                          onChange={(e) => {
                            const newDetails = { 
                              ...timetableDetails, 
                              [detailKey]: { ...detail, location: e.target.value },
                              [`${todayKey}-${period}`]: { ...detail, location: e.target.value }
                            };
                            setTimetableDetails(newDetails);
                          }}
                          className="w-full bg-transparent text-xs text-white py-2 outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-lg px-3 border border-white/10 focus-within:border-amber-500/50">
                        <FileText size={12} className="text-slate-500 shrink-0"/>
                        <input
                          type="text"
                          placeholder="공지/메모 (예: 준비물 지참, 숙제 제출)"
                          value={detail.memo}
                          onChange={(e) => {
                            const newDetails = { 
                              ...timetableDetails, 
                              [detailKey]: { ...detail, memo: e.target.value },
                              [`${todayKey}-${period}`]: { ...detail, memo: e.target.value }
                            };
                            setTimetableDetails(newDetails);
                          }}
                          className="w-full bg-transparent text-xs text-white py-2 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => {
                  const newDetails = { ...timetableDetails };
                  const todayKey = `${schoolConfig.currentGrade}-${schoolConfig.currentClass}`;
                  [1, 2, 3, 4, 5, 6, 7].forEach(period => {
                    const detailKey = `${todayKey}-${remoteDayOfWeek}-${period}`;
                    delete newDetails[detailKey];
                    delete newDetails[`${todayKey}-${period}`];
                  });
                  setTimetableDetails(newDetails);
                }}
                className="bg-[#2a2a2a] hover:bg-[#333] text-slate-300 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Trash2 size={18} />
                내용 초기화
              </button>
              <button 
                onClick={() => {
                  try { localStorage.setItem('timetable_details', JSON.stringify(timetableDetails)); } catch(e) {}
                  if (db) {
                    import("firebase/database").then(({ ref: dbRef, set }) => {
                      set(dbRef(db, 'globalData/timetableDetails'), timetableDetails).then(() => {
                        setMemoSuccessToast(true);
                        setTimeout(() => setMemoSuccessToast(false), 3000);
                      }).catch(console.error);
                    });
                  } else {
                    setMemoSuccessToast(true);
                    setTimeout(() => setMemoSuccessToast(false), 3000);
                  }
                }}
                className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-xl font-bold shadow-[0_0_15px_rgba(217,119,6,0.4)] flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <Send size={18} />
                전자칠판으로 일괄 전송 (저장)
              </button>
            </div>
          </section>

        </main>

        {sendSuccessToast && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 p-4 px-6 bg-emerald-500 text-white rounded-2xl text-sm font-bold flex items-center gap-3 animate-fade-in shadow-2xl z-50">
            <CheckCircle2 size={20} />
            전송 완료! 교실 알림판에 팝업이 표시됩니다.
          </div>
        )}
        
        {memoSuccessToast && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 p-4 px-6 bg-amber-500 text-white rounded-2xl text-sm font-bold flex items-center gap-3 animate-fade-in shadow-2xl z-50">
            <CheckCircle2 size={20} />
            알림장/메모가 전자칠판으로 성공적으로 전송되었습니다!
          </div>
        )}
      </div>
    );
  }

  if (viewMode === 'admin') {
    // === [입력 유효성 검사 로직 추가] ===
    const isSchoolNameValid = adminSchoolName.trim().length > 0;
    const isPinValid = /^\d{4}$/.test(adminPinInput.trim());
    const isNeisApiKeyValid = !adminNeisApiKey.trim() || /^[a-fA-F0-9]{32}$/.test(adminNeisApiKey.trim());
    const isGeminiApiKeyValid = !adminGeminiApiKey.trim() || adminGeminiApiKey.trim().length > 10;
    const isEduCodeValid = !adminEduCode.trim() || /^[A-Za-z]\d{2}$/.test(adminEduCode.trim());
    const isSchoolCodeValid = !adminSchoolCode.trim() || /^\d{7,8}$/.test(adminSchoolCode.trim());
    const isAppinUrlValid = !adminAppinServerUrl.trim() || /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?:\:[0-9]{1,5})?(?:\/.*)?$/.test(adminAppinServerUrl.trim()) || /^https?:\/\//.test(adminAppinServerUrl.trim());

    // 시간표 입력 검증: 1교시가 비어있는 요일이 있으면 경고 표시 (선택적)
    // 여기서는 형식적 오류 방지를 위해 입력칸들에 대한 주요 검증만 진행
    
    const warningMessages = [];
    if (!isSchoolNameValid) warningMessages.push("학교명을 입력해주세요.");
    if (!isPinValid) warningMessages.push("관리자 비밀번호는 4자리 숫자로 입력해야 합니다.");
    if (!isNeisApiKeyValid) warningMessages.push("나이스 API 키가 32자리 올바른 형식(영문/숫자)이 아닙니다.");
    if (!isGeminiApiKeyValid) warningMessages.push("Gemini API 키가 너무 짧습니다.");
    if (!isEduCodeValid) warningMessages.push("시도교육청 코드가 올바르지 않습니다 (예: J10).");
    if (!isSchoolCodeValid) warningMessages.push("표준학교코드가 올바르지 않습니다 (7~8자리 숫자).");
    if (!isAppinUrlValid) warningMessages.push("압핀 서버 주소가 올바르지 않습니다 (IP:포트 또는 URL 형식).");

    const isConfigValid = warningMessages.length === 0;

    const handleSaveClick = () => {
      if (!isConfigValid) {
        alert("입력값이 올바르지 않습니다. 경고 문구를 확인해주세요.\n\n" + warningMessages.join("\n"));
        return;
      }
      handleSaveAdminSettings();
    };

    return (
      <div className="h-screen w-full bg-[#111a15] text-white flex flex-col select-none overflow-y-auto" style={{ WebkitAppRegion: "drag" } as any}>
        <header className="h-16 px-6 bg-[#162d22] border-b border-emerald-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={handleGoHome} style={{ WebkitAppRegion: "no-drag" } as any} className="p-2 rounded-xl bg-emerald-950 text-emerald-300 hover:bg-emerald-900 cursor-pointer flex items-center gap-1 text-xs font-bold">
              <ArrowLeft size={16} /> 홈으로
            </button>
            <h1 className="text-lg font-bold text-indigo-300 flex items-center gap-2">
              ⚙️ 관리자 환경설정 패널 <span className="text-xs font-mono bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-700/50 font-bold">{APP_VERSION}</span>{renderUpdateBadge()}
            </h1>
          </div>
          <button onClick={handleSaveClick} style={{ WebkitAppRegion: "no-drag" } as any} 
            disabled={!isConfigValid}
            className={`px-5 py-2 rounded-xl text-xs font-bold shadow-md transition-colors ${isConfigValid ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
          >
            저장 후 달력 동기화
          </button>
        </header>

        <main className="flex-1 p-8 max-w-4xl mx-auto w-full space-y-8 pb-16" style={{ WebkitAppRegion: "no-drag" } as any}>
          
          <section className="bg-[#1c2e25] border border-indigo-500/40 rounded-3xl p-6 shadow-xl flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-indigo-300 flex items-center gap-2">🗓️ 달력 데이터 선택</h2>
              <p className="text-xs text-slate-400 mt-1">아래에서 요일을 선택하면 해당 요일의 <b>학기 고정 시간표</b>를 수정할 수 있습니다. (급식은 해당 특정 날짜로 저장됩니다)</p>
            </div>
            <input 
              type="date" 
              value={adminDate}
              onChange={e => setAdminDate(e.target.value)}
              className="px-4 py-3 bg-[#111a15] text-white font-bold rounded-xl border border-emerald-900 text-sm outline-none focus:border-amber-400 cursor-pointer"
            />
          </section>

          <section className="bg-[#1c2e25] border border-indigo-500/40 rounded-3xl p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-indigo-300 flex items-center gap-2">🏫 기본 학교 정보 & 외부 API 설정</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">교실 화면 테마 (색감)</label>
                <select 
                  value={adminClassroomTheme}
                  onChange={e => setAdminClassroomTheme(e.target.value)}
                  className="w-full px-4 py-3 bg-[#111a15] text-white rounded-xl border border-emerald-900 text-sm focus:border-emerald-500 outline-none"
                >
                  <option value="default">기본 (그린/에메랄드)</option>
                  <option value="dark">다크 모드 (어두운 회색/블랙)</option>
                  <option value="light">라이트 모드 (화이트/밝은 파랑)</option>
                  <option value="auto">자동 스케줄러 (오후 6시~오전 6시 다크모드)</option>
                </select>
              </div>
                <label className="text-xs font-bold text-slate-400">학교명 (UI 표시용)</label>
                <input 
                  type="text" 
                  value={adminSchoolName}
                  onChange={e => setAdminSchoolName(e.target.value)}
                  className={`w-full px-4 py-3 bg-[#111a15] text-white rounded-xl border text-sm outline-none transition-colors ${!isSchoolNameValid ? 'border-rose-500 focus:border-rose-400' : 'border-emerald-900 focus:border-emerald-500'}`}
                  placeholder="예: 사직여자고등학교"
                />
                {!isSchoolNameValid && <p className="text-[10px] text-rose-400 mt-1">학교명을 입력해주세요.</p>}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">NEIS 학교코드 (schoolCode)</label>
                <input 
                  type="text" 
                  value={adminSchoolCode}
                  onChange={e => setAdminSchoolCode(e.target.value)}
                  className="w-full px-4 py-3 bg-[#111a15] text-white rounded-xl border border-emerald-900 text-sm focus:border-emerald-500 outline-none"
                  placeholder="예: 7150144"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">NEIS 시도교육청코드 (eduCode)</label>
                <input 
                  type="text" 
                  value={adminEduCode}
                  onChange={e => setAdminEduCode(e.target.value)}
                  className="w-full px-4 py-3 bg-[#111a15] text-white rounded-xl border border-emerald-900 text-sm focus:border-emerald-500 outline-none"
                  placeholder="예: C10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">NEIS API KEY (급식/시간표 연동용)</label>
                <input 
                  type="password" 
                  value={adminNeisApiKey}
                  onChange={e => setAdminNeisApiKey(e.target.value)}
                  className={`w-full px-4 py-3 bg-[#111a15] text-white rounded-xl border text-sm outline-none transition-colors ${!isNeisApiKeyValid ? 'border-rose-500 focus:border-rose-400' : 'border-emerald-900 focus:border-emerald-500'}`}
                  placeholder="발급받은 NEIS API KEY 입력"
                />
                {!isNeisApiKeyValid && <p className="text-[10px] text-rose-400 mt-1">32자리 영문/숫자 형식이어야 합니다.</p>}
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-xs font-bold text-slate-400">Google Gemini API KEY (학생 명렬, 시간표 등 자동파싱 AI용)</label>
                <div className="flex gap-2">
                  <div className="flex-1 flex flex-col gap-1">
                    <input 
                      type="password" 
                      value={adminGeminiApiKey}
                      onChange={e => setAdminGeminiApiKey(e.target.value)}
                      className={`w-full px-4 py-3 bg-[#111a15] text-white rounded-xl border text-sm outline-none transition-colors ${!isGeminiApiKeyValid ? 'border-rose-500 focus:border-rose-400' : 'border-emerald-900 focus:border-emerald-500'}`}
                      placeholder="발급받은 Google Gemini API KEY 입력"
                    />
                    {!isGeminiApiKeyValid && <p className="text-[10px] text-rose-400">키 길이가 너무 짧습니다.</p>}
                  </div>
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="px-4 py-3 bg-indigo-900/40 hover:bg-indigo-900 text-indigo-300 rounded-xl text-xs font-bold flex items-center justify-center border border-indigo-700/50">
                    <Key size={14} className="mr-1"/> 키 발급받기
                  </a>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-emerald-900/60 mt-4">
              <label className="text-xs text-rose-300 font-bold mb-2 flex items-center gap-1.5"><Lock size={14}/> 보안: 관리자 비밀번호(PIN) 변경</label>
              <input
                type="text"
                maxLength={4}
                value={adminPinInput}
                onChange={(e) => setAdminPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="숫자 4자리 입력 (기본: 0000)"
                className="w-48 px-4 py-2 bg-[#111a15] text-center tracking-[0.5em] font-mono text-white rounded-xl border border-rose-900 text-sm focus:border-rose-500 outline-none"
              />
            </div>
            
            <div className="pt-4 border-t border-emerald-900/60 mt-4">
              <label className="text-xs text-blue-300 font-bold mb-2 flex items-center gap-1.5"><Volume2 size={14}/> 접근성: 팝업 알림 음성(TTS) 설정</label>
              
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <select
                    value={adminTtsVoiceURI}
                    onChange={(e) => setAdminTtsVoiceURI(e.target.value)}
                    className="flex-1 bg-[#111a15] text-white px-4 py-2 rounded-xl border border-blue-900 text-sm focus:border-blue-500 outline-none"
                  >
                    <option value="">기본 시스템 음성</option>
                    {availableVoices.map((voice) => (
                      <option key={voice.voiceURI} value={voice.voiceURI}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      const utterance = new SpeechSynthesisUtterance("안내 말씀 드립니다. 교무실로 와주세요.");
                      utterance.lang = "ko-KR";
                      utterance.rate = adminTtsRate; // 슬라이더 설정값 적용
                      utterance.pitch = 0.95;
                      if (adminTtsVoiceURI) {
                        const voice = availableVoices.find(v => v.voiceURI === adminTtsVoiceURI);
                        if (voice) utterance.voice = voice;
                      }
                      window.speechSynthesis.speak(utterance);
                    }}
                    className="px-4 py-2 bg-blue-900/50 hover:bg-blue-800 text-blue-200 rounded-xl text-xs font-bold border border-blue-700/50 transition-colors"
                  >
                    테스트 재생
                  </button>
                </div>

                <div className="flex items-center gap-4 bg-[#111a15] p-3 rounded-xl border border-blue-900/50">
                  <label className="text-xs text-blue-200 font-bold whitespace-nowrap">읽기 속도</label>
                  <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.05"
                    value={adminTtsRate}
                    onChange={(e) => setAdminTtsRate(parseFloat(e.target.value))}
                    className="flex-1 accent-blue-500 h-1.5 bg-blue-900/40 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-xs font-mono text-blue-300 w-8 text-right">{adminTtsRate.toFixed(2)}x</span>
                </div>
              </div>
              
              <p className="text-[10px] text-blue-400/60 mt-2">※ 기기(PC, 브라우저)에 설치된 음성만 표시됩니다.</p>
            </div>

            <div className="pt-4 border-t border-emerald-900/60 mt-4 space-y-3">
              <label className="text-xs text-amber-300 font-bold mb-2 flex items-center gap-1.5"><Clock size={14}/> 알림 팝업 자동 닫힘 시간 설정</label>
              
              <div className="bg-[#111a15] p-3 rounded-xl border border-amber-900/50 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <label className="text-xs text-amber-200 font-bold whitespace-nowrap">전체 기본 유지 시간</label>
                    <input
                      type="range"
                      min="10"
                      max="300"
                      step="5"
                      value={adminPopupTimeout}
                      onChange={(e) => setAdminPopupTimeout(parseInt(e.target.value))}
                      className="flex-1 accent-amber-500 h-1.5 bg-amber-900/40 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-xs font-mono text-amber-300 w-12 text-right">{adminPopupTimeout}초</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap pl-28">
                    {[15, 30, 60, 90, 120, 180].map(sec => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setAdminPopupTimeout(sec)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${adminPopupTimeout === sec ? 'bg-amber-500 text-black font-black' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                      >
                        {sec}초
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-amber-900/40 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-emerald-300 font-bold">대상 학급 선택:</span>
                      <select
                        value={editTargetGrade}
                        onChange={e => setEditTargetGrade(Number(e.target.value))}
                        className="bg-[#16221c] text-emerald-300 border border-emerald-700/60 rounded-lg px-2 py-1 text-xs font-bold outline-none"
                      >
                        {[1, 2, 3].map(g => <option key={g} value={g}>{g}학년</option>)}
                      </select>
                      <select
                        value={editTargetClass}
                        onChange={e => setEditTargetClass(Number(e.target.value))}
                        className="bg-[#16221c] text-emerald-300 border border-emerald-700/60 rounded-lg px-2 py-1 text-xs font-bold outline-none"
                      >
                        {Array.from({ length: adminGradeCounts[editTargetGrade as 1|2|3] || 8 }, (_, i) => i + 1).map(c => <option key={c} value={c}>{c}반</option>)}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setClassPopupTimeouts(tempClassPopupTimeouts);
                        try { localStorage.setItem('class_popup_timeouts', JSON.stringify(tempClassPopupTimeouts)); } catch(e) {}
                        if (db) {
                          set(ref(db, 'globalData/classPopupTimeouts'), tempClassPopupTimeouts).catch(console.error);
                        }
                        setSaveSuccessToast(true);
                        setTimeout(() => setSaveSuccessToast(false), 3000);
                      }}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow cursor-pointer active:scale-95 transition-all"
                    >
                      <Save size={13} /> 개별 시간 즉시 동기화
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="text-xs text-emerald-300 font-bold whitespace-nowrap">
                      {editTargetGrade}학년 {editTargetClass}반 유지 시간
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="300"
                      step="5"
                      value={tempClassPopupTimeouts[editTargetGrade + '-' + editTargetClass] !== undefined ? tempClassPopupTimeouts[editTargetGrade + '-' + editTargetClass] : adminPopupTimeout}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        const key = editTargetGrade + '-' + editTargetClass;
                        setTempClassPopupTimeouts(prev => ({ ...prev, [key]: val }));
                      }}
                      className="flex-1 accent-emerald-500 h-1.5 bg-emerald-900/40 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-xs font-mono text-emerald-300 w-12 text-right">
                      {(tempClassPopupTimeouts[editTargetGrade + '-' + editTargetClass] !== undefined ? tempClassPopupTimeouts[editTargetGrade + '-' + editTargetClass] : adminPopupTimeout)}초
                    </span>
                    {tempClassPopupTimeouts[editTargetGrade + '-' + editTargetClass] !== undefined && (
                      <button
                        type="button"
                        onClick={() => {
                          const key = editTargetGrade + '-' + editTargetClass;
                          const newMap = { ...tempClassPopupTimeouts };
                          delete newMap[key];
                          setTempClassPopupTimeouts(newMap);
                          setClassPopupTimeouts(newMap);
                          try { localStorage.setItem('class_popup_timeouts', JSON.stringify(newMap)); } catch(e) {}
                          if (db) { set(ref(db, 'globalData/classPopupTimeouts'), newMap).catch(console.error); }
                        }}
                        className="text-[10px] bg-rose-900/60 hover:bg-rose-800 text-rose-200 px-2 py-1 rounded border border-rose-700 whitespace-nowrap cursor-pointer"
                      >
                        기본값 복원
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap pl-32">
                    {[15, 30, 60, 90, 120, 180].map(sec => {
                      const key = editTargetGrade + '-' + editTargetClass;
                      const curVal = tempClassPopupTimeouts[key] !== undefined ? tempClassPopupTimeouts[key] : adminPopupTimeout;
                      return (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => {
                            const newMap = { ...tempClassPopupTimeouts, [key]: sec };
                            setTempClassPopupTimeouts(newMap);
                          }}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${curVal === sec ? 'bg-emerald-500 text-black font-black' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                        >
                          {sec}초
                        </button>
                      );
                    })}
                  </div>

                  {Object.keys(tempClassPopupTimeouts).length > 0 && (
                    <div className="pt-2 border-t border-emerald-900/30">
                      <div className="text-[11px] text-slate-400 font-bold mb-1.5">현재 개별 시간 설정된 학급 목록:</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(tempClassPopupTimeouts).map(([key, sec]) => {
                          const [g, c] = key.split('-');
                          return (
                            <div key={key} className="bg-emerald-950/70 border border-emerald-700/60 text-emerald-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-2">
                              <span>{g}학년 {c}반: <strong className="text-amber-400">{sec}초</strong></span>
                              <button
                                type="button"
                                onClick={() => {
                                  const newMap = { ...tempClassPopupTimeouts };
                                  delete newMap[key];
                                  setTempClassPopupTimeouts(newMap);
                                  setClassPopupTimeouts(newMap);
                                  try { localStorage.setItem('class_popup_timeouts', JSON.stringify(newMap)); } catch(e) {}
                                  if (db) { set(ref(db, 'globalData/classPopupTimeouts'), newMap).catch(console.error); }
                                }}
                                className="text-rose-400 hover:text-rose-200 text-[10px] font-black cursor-pointer"
                                title="삭제 (기본값으로 복원)"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-amber-400/60">※ 전체 기본 유지 시간 외에, 선택한 학급별로 팝업 자동 닫힘 시간을 각각 다르게 설정할 수 있습니다.</p>
            </div>

            {/* 🔔 수업 시간 중 팝업 동작 설정 (대기열 vs 즉시 강제 팝업) */}
            <div className="pt-4 border-t border-emerald-900/60 mt-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs text-indigo-300 font-bold flex items-center gap-1.5">
                  <Bell size={14} className="text-amber-400" /> 수업 시간 중 알림 팝업 동작 제어 (대기열 관리)
                </label>
                <button
                  type="button"
                  onClick={() => handleToggleForcePopupDuringClass(!adminForcePopupDuringClass)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 ${adminForcePopupDuringClass ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-emerald-700 hover:bg-emerald-600 text-white'}`}
                >
                  <RefreshCw size={13} />
                  {adminForcePopupDuringClass ? '⚡ 강제 팝업 모드 켜짐 (대기열 모드로 전환)' : '🛡️ 수업 보호(대기열) 모드 켜짐 (강제 모드로 전환)'}
                </button>
              </div>

              <div className={`p-4 rounded-2xl border transition-all ${adminForcePopupDuringClass ? 'bg-amber-950/30 border-amber-500/50' : 'bg-[#111a15] border-emerald-900/60'}`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="adminForcePopupToggle"
                    checked={adminForcePopupDuringClass}
                    onChange={(e) => handleToggleForcePopupDuringClass(e.target.checked)}
                    className="w-5 h-5 accent-amber-500 rounded cursor-pointer mt-0.5"
                  />
                  <div className="flex-1">
                    <label htmlFor="adminForcePopupToggle" className="text-sm font-bold text-white cursor-pointer flex items-center gap-2">
                      수업 중에도 즉시 강제 팝업 허용
                      {adminForcePopupDuringClass ? (
                        <span className="text-[10px] bg-amber-500 text-black px-2 py-0.5 rounded-full font-black">⚡ 강제 팝업 활성화됨</span>
                      ) : (
                        <span className="text-[10px] bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded-full font-bold">🛡️ 수업 보호: 대기열 보관 (기본값)</span>
                      )}
                    </label>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      {adminForcePopupDuringClass ? (
                        <span className="text-amber-300 font-medium">
                          ⚠️ <strong>[수업 중 강제 팝업 활성화]</strong> 교실에서 1~7교시 수업이 진행 중이라도 교무실에서 공지나 호출을 전송하면 대기열에 들어가지 않고 <strong>즉시 소리와 함께 전자칠판 화면에 전체 팝업</strong>이 뜹니다.
                        </span>
                      ) : (
                        <span className="text-emerald-300/90 font-medium">
                          ✅ <strong>[수업 보호 대기열 모드]</strong> 1~7교시 수업 중에는 수업 집중을 위해 알림이 화면을 가리지 않고 <strong>좌측 하단 예약 대기열에 안전하게 보관</strong>되며, <strong>종이 치고 쉬는 시간이 되는 즉시 자동으로 팝업</strong>됩니다.
                        </span>
                      )}
                    </p>
                    <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center gap-3 text-[11px] text-slate-400">
                      <span>💡 <strong>팁:</strong> 대기열 모드 상태에서도 교무실 리모컨에서 <strong>[⚡ 수업 중 즉시 강제 팝업]</strong> 체크박스를 켜고 보내면 특정 긴급 공지만 즉시 띄울 수 있습니다.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          <section className="bg-[#1c2e25] border border-indigo-500/40 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-base font-bold text-indigo-300 flex items-center gap-2">👥 학급별 학생 명렬 관리</h2>
              
              <div className="relative">
                <input 
                  type="file" 
                  accept=".csv, .txt" 
                  onChange={handleStudentCsvUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  title="전교생 통합 CSV 파일 업로드"
                />
                <div className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer">
                  <Upload size={14} /> 전교생 통합 CSV 업로드 (1~8반 자동 분류 & 덮어쓰기)
                </div>
              </div>
            </div>

            <div className="flex gap-2 p-2 bg-[#111a15] rounded-xl border border-emerald-900">
              <select 
                value={editTargetGrade}
                onChange={e => setEditTargetGrade(Number(e.target.value))}
                className="flex-1 bg-transparent text-white px-2 py-1 outline-none font-bold text-sm"
              >
                {[1, 2, 3].map(g => <option key={g} value={g}>{g}학년</option>)}
              </select>
              <select 
                value={editTargetClass}
                onChange={e => setEditTargetClass(Number(e.target.value))}
                className="flex-1 bg-transparent text-white px-2 py-1 outline-none font-bold text-sm"
              >
                {Array.from({ length: adminGradeCounts[editTargetGrade as 1|2|3] || 8 }, (_, i) => i + 1).map(c => <option key={c} value={c}>{c}반</option>)}
              </select>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {(tempClassRosters[`${editTargetGrade}-${editTargetClass}`] || []).map((stu, i) => (
                <div key={i} className="flex items-center bg-[#1a2e24] px-3 py-1.5 rounded-lg border border-emerald-800 text-sm">
                  <span>{stu}</span>
                  <button 
                    onClick={() => {
                      const newList = [...(tempClassRosters[`${editTargetGrade}-${editTargetClass}`] || [])];
                      newList.splice(i, 1);
                      setTempClassRosters({...tempClassRosters, [`${editTargetGrade}-${editTargetClass}`]: newList});
                    }}
                    className="ml-2 text-rose-400 hover:text-rose-300"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              <input 
                type="text" 
                value={newStudentNum}
                onChange={e => setNewStudentNum(e.target.value)}
                placeholder="번호"
                className="w-16 px-3 py-2 bg-[#111a15] rounded-xl border border-emerald-900 text-sm text-white text-center outline-none"
              />
              <input 
                type="text" 
                value={newStudentNameOnly}
                onChange={e => setNewStudentNameOnly(e.target.value)}
                placeholder="이름 (예: 홍길동)"
                className="flex-1 px-3 py-2 bg-[#111a15] rounded-xl border border-emerald-900 text-sm text-white outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newStudentNameOnly.trim() && newStudentNum.trim()) {
                    const key = `${editTargetGrade}-${editTargetClass}`;
                    const newList = [...(tempClassRosters[key] || [])];
                    const numStr = newStudentNum.padStart(2, '0');
                    newList.push(`${numStr} ${newStudentNameOnly.trim()}`);
                    newList.sort();
                    setTempClassRosters({...tempClassRosters, [key]: newList});
                    setNewStudentNameOnly('');
                    setNewStudentNum(String(Number(newStudentNum) + 1));
                  }
                }}
              />
              <button 
                onClick={() => {
                  if(newStudentNameOnly.trim() && newStudentNum.trim()) {
                    const key = `${editTargetGrade}-${editTargetClass}`;
                    const newList = [...(tempClassRosters[key] || [])];
                    const numStr = newStudentNum.padStart(2, '0');
                    newList.push(`${numStr} ${newStudentNameOnly.trim()}`);
                    newList.sort();
                    setTempClassRosters({...tempClassRosters, [key]: newList});
                    setNewStudentNameOnly('');
                    setNewStudentNum(String(Number(newStudentNum) + 1));
                  }
                }}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 rounded-xl text-xs font-bold"
              >
                추가
              </button>
            </div>
          </section>

          <section className="bg-[#1c2e25] border border-indigo-500/40 rounded-3xl p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-indigo-300 flex items-center gap-2">⏰ 일과 시간 및 학급 시간표</h2>
            
            <div className="space-y-3">
              <label className="text-xs text-amber-300 font-bold block">교시별 일과시간 설정 (학교 전체 공통)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[1, 2, 3, 4, 5, 6, 7].map((p) => {
                  const sch = tempDailySchedule[p] || { startH: '09', startM: '00', endH: '10', endM: '00' };
                  return (
                    <div key={p} className="bg-[#111a15] p-3 rounded-xl border border-emerald-900 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-emerald-400 w-16">{p}교시</span>
                      
                      <div className="flex items-center gap-1">
                        <select 
                          value={sch.startH}
                          onChange={(e) => setTempDailySchedule({...tempDailySchedule, [p]: {...sch, startH: e.target.value}})}
                          className="bg-transparent text-white border-b border-emerald-700 text-xs py-1"
                        >
                          {hoursList.map(h => <option key={h} value={h} className="bg-[#111]">{h}</option>)}
                        </select>
                        <span>:</span>
                        <select 
                          value={sch.startM}
                          onChange={(e) => setTempDailySchedule({...tempDailySchedule, [p]: {...sch, startM: e.target.value}})}
                          className="bg-transparent text-white border-b border-emerald-700 text-xs py-1"
                        >
                          {minutesList.map(m => <option key={m} value={m} className="bg-[#111]">{m}</option>)}
                        </select>
                      </div>
                      <span className="text-xs text-emerald-600">-</span>
                      <div className="flex items-center gap-1">
                        <select 
                          value={sch.endH}
                          onChange={(e) => setTempDailySchedule({...tempDailySchedule, [p]: {...sch, endH: e.target.value}})}
                          className="bg-transparent text-white border-b border-emerald-700 text-xs py-1"
                        >
                          {hoursList.map(h => <option key={h} value={h} className="bg-[#111]">{h}</option>)}
                        </select>
                        <span>:</span>
                        <select 
                          value={sch.endM}
                          onChange={(e) => setTempDailySchedule({...tempDailySchedule, [p]: {...sch, endM: e.target.value}})}
                          className="bg-transparent text-white border-b border-emerald-700 text-xs py-1"
                        >
                          {minutesList.map(m => <option key={m} value={m} className="bg-[#111]">{m}</option>)}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-6 border-t border-emerald-900/40 space-y-3">
              <label className="text-xs text-amber-300 font-bold block">{adminDate} ({['일', '월', '화', '수', '목', '금', '토'][new Date(adminDate).getDay()]}요일) 학급 시간표</label>
              
              <div className="bg-[#111a15] border border-emerald-900 rounded-2xl p-4 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-emerald-200">엑셀/이미지 자동 인식 (컴시간/압핀 연동)</span>
                  <div className="relative flex-1">
                    <input 
                      type="file" 
                      accept="image/*, .csv, .txt, .pdf, .xls, .xlsx" 
                      onChange={handleTimetableImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      title="시간표 파일 선택"
                    />
                    <div className="px-4 py-3 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer transition-colors w-full border border-emerald-600">
                      {isNeisLoading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
                      {timetableFileName || '컴시간/압핀 엑셀 파일(.xlsx) 업로드 (전교생 일괄 갱신)'}
                    </div>
                  </div>
                </div>
                
                <p className="text-[11px] text-emerald-400/80 text-center bg-emerald-900/30 py-2 rounded-lg">※ 컴시간/압핀 엑셀 파일을 올리면 전체 학급이 1초 만에 최신화됩니다. (이미지는 현재 학급만 AI로 분석)</p>

                <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-emerald-900/40">
                  <span className="text-sm font-bold text-emerald-200">내부망 서버 직접 연동 (URL/IP)</span>
                  <div className="flex gap-2">
                    <div className="flex-1 flex flex-col gap-1">
                      <input
                        type="text"
                        value={adminAppinServerUrl}
                        onChange={e => setAdminAppinServerUrl(e.target.value)}
                        placeholder="예: 192.168.1.100/1053"
                        className={`w-full px-4 py-2.5 bg-black/40 text-white rounded-xl border text-sm outline-none transition-colors ${!isAppinUrlValid ? 'border-rose-500 focus:border-rose-400' : 'border-emerald-800 focus:border-emerald-500'}`}
                      />
                      {!isAppinUrlValid && <p className="text-[10px] text-rose-400">올바른 IP/포트 또는 URL 형식이 아닙니다.</p>}
                    </div>
                    <button
                      onClick={handleFetchAppinServer}
                      disabled={isNeisLoading || !adminAppinServerUrl}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md transition-colors whitespace-nowrap"
                    >
                      {isNeisLoading ? "접속 중..." : "서버에서 추출"}
                    </button>
                  </div>
                  <p className="text-[10px] text-emerald-400/60">※ 접속상태 하단에 표시된 서버 주소를 입력하면, 해당 서버의 시간표 정보를 인공지능이 분석하여 채워줍니다.</p>
                </div>
                
                <div className="pt-3 mt-3 border-t border-emerald-900/40">
                  <span className="text-sm font-bold text-amber-300">나이스(NEIS) 연동 (공공데이터)</span>
                  <p className="text-[10px] text-amber-200/60 mb-2">※ 내부망이 막혀있을 경우, 위에서 설정한 NEIS API 키를 사용하여 나이스 서버에서 시간표를 직접 가져옵니다.</p>
                  <button
                    onClick={() => handleNeisFetch('timetable')}
                    disabled={isNeisLoading || !adminNeisApiKey || !adminSchoolCode || !adminEduCode}
                    className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2"
                  >
                    {isNeisLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    나이스(NEIS) 서버에서 현재 학급 시간표 추출
                  </button>
                </div>


                <div className="grid grid-cols-7 gap-2 mt-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((p) => {
                    const currentMap = tempClassTimetables[`${editTargetGrade}-${editTargetClass}`] || {};
                    const currentDayObj = currentMap[adminDayOfWeek] || {};
                    return (
                      <div key={p} className="flex flex-col gap-1">
                        <span className="text-[10px] text-center text-emerald-500 font-bold">{p}교시</span>
                        <input 
                          type="text" 
                          value={currentDayObj[p] || ''}
                          onChange={(e) => {
                            const newMap = { ...currentMap };
                            newMap[adminDayOfWeek] = { ...currentDayObj, [p]: e.target.value };
                            setTempClassTimetables({ ...tempClassTimetables, [`${editTargetGrade}-${editTargetClass}`]: newMap });
                          }}
                          className="w-full text-center px-1 py-2 bg-[#162d22] border border-emerald-800 rounded-lg text-xs text-white focus:border-amber-400 outline-none"
                          placeholder="과목"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-[#1c2e25] border border-indigo-500/40 rounded-3xl p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-indigo-300 flex items-center gap-2">🍽️ 급식 식단 관리</h2>
            
            <div className="bg-[#111a15] border border-emerald-900 rounded-2xl p-4 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-emerald-200">엑셀/이미지 자동 인식 (컴시간/압핀 연동)</span>
                <div className="relative flex-1">
                  <input 
                    type="file" 
                    accept="image/*, .pdf" 
                    onChange={handleMealFileupload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    title="급식표 파일 선택"
                  />
                  <div className="px-4 py-3 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer transition-colors w-full border border-emerald-600">
                    {isNeisLoading ? <Loader2 size={16} className="animate-spin" /> : <Utensils size={16} />}
                    {mealFileName || '월간 급식표 이미지 업로드하여 자동 채우기'}
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-emerald-900/40">
                  <p className="text-[10px] text-amber-200/60 mb-2">※ 나이스 서버에서 해당 날짜({adminDate})의 급식 정보를 바로 가져옵니다.</p>
                  <button
                    onClick={() => handleNeisFetch('meal')}
                    disabled={isNeisLoading || !adminNeisApiKey || !adminSchoolCode || !adminEduCode}
                    className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2"
                  >
                    {isNeisLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    나이스(NEIS) 서버에서 선택한 날짜의 급식 추출
                  </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="space-y-2">
                  <label className="text-xs text-amber-300 font-bold block">{adminDate} 중식 (점심)</label>
                  <textarea 
                    value={(tempMeals[adminDateKey] || {}).lunch || ''}
                    onChange={(e) => {
                      const dayMeals = tempMeals[adminDateKey] || {};
                      setTempMeals({ ...tempMeals, [adminDateKey]: { ...dayMeals, lunch: e.target.value } });
                    }}
                    className="w-full h-24 p-3 bg-[#162d22] border border-emerald-800 rounded-xl text-xs text-white resize-none outline-none focus:border-amber-400"
                    placeholder="예: 기장밥\n미역국\n불고기\n배추김치"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-amber-300 font-bold block">{adminDate} 석식 (저녁)</label>
                  <textarea 
                    value={(tempMeals[adminDateKey] || {}).dinner || ''}
                    onChange={(e) => {
                      const dayMeals = tempMeals[adminDateKey] || {};
                      setTempMeals({ ...tempMeals, [adminDateKey]: { ...dayMeals, dinner: e.target.value } });
                    }}
                    className="w-full h-24 p-3 bg-[#162d22] border border-emerald-800 rounded-xl text-xs text-white resize-none outline-none focus:border-amber-400"
                    placeholder="해당 없음"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-[#1e382b] border border-indigo-900 rounded-3xl p-6 shadow-xl relative z-10">
            <h2 className="text-xl font-black text-indigo-300 mb-6 flex items-center gap-3">
              <div className="p-2 bg-indigo-900/60 rounded-xl"><Edit3 size={20} /></div>
              리모컨 호출 메시지 프리셋 관리
            </h2>
            <div className="bg-[#111a15] border border-emerald-900 rounded-2xl p-4 space-y-4">
              <p className="text-xs text-slate-400">
                선생님들이 리모컨 모드에서 자주 사용하는 호출 메시지 목록을 수정하거나 추가할 수 있습니다.
              </p>
              
              <div className="space-y-3">
                {tempCustomCallPresets.map((preset, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-400 w-6">{idx + 1}.</span>
                    <input 
                      type="text"
                      value={preset}
                      onChange={(e) => {
                        const newPresets = [...tempCustomCallPresets];
                        newPresets[idx] = e.target.value;
                        setTempCustomCallPresets(newPresets);
                      }}
                      className="flex-1 bg-[#162d22] border border-emerald-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
                      placeholder="메시지를 입력하세요 (예: 교무실로 오세요)"
                    />
                    <button 
                      onClick={() => {
                        const newPresets = tempCustomCallPresets.filter((_, i) => i !== idx);
                        setTempCustomCallPresets(newPresets);
                      }}
                      className="p-2 bg-rose-900/40 hover:bg-rose-900 text-rose-400 rounded-xl transition-colors"
                      title="삭제"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
              
              <button 
                onClick={() => setTempCustomCallPresets([...tempCustomCallPresets, '새 호출 메시지'])}
                className="w-full mt-2 py-3 bg-indigo-900/30 hover:bg-indigo-900/60 border border-indigo-800/50 text-indigo-300 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                + 새 프리셋 추가하기
              </button>
            </div>
          </section>

          <div className="flex gap-4 pt-6">
            <button 
              onClick={() => {
                if (window.confirm('정말 모든 데이터를 초기화하시겠습니까? (복구 불가)')) {
                  localStorage.clear();
                  window.location.reload();
                }
              }} 
              className="px-6 py-3.5 bg-rose-900/60 hover:bg-rose-800 text-rose-300 rounded-2xl text-xs font-bold cursor-pointer transition-colors border border-rose-800"
            >
              🧹 용량 초과 오류 해결 (초기화)
            </button>
            <div className="flex flex-col items-end gap-2">
              {!isConfigValid && (
                <div className="text-rose-400 text-xs font-bold bg-rose-900/30 px-3 py-2 rounded-lg border border-rose-800 text-right">
                  {warningMessages.map((msg, i) => <div key={i}>• {msg}</div>)}
                </div>
              )}
              <button onClick={handleSaveClick} style={{ WebkitAppRegion: "no-drag" } as any} 
                disabled={!isConfigValid}
                className={`px-8 py-3.5 rounded-2xl text-sm font-bold shadow-lg transition-colors ${isConfigValid ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
              >
                설정 저장 및 달력 동기화
              </button>
            </div>
          </div>

        </main>
        
        {saveSuccessToast && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 p-4 px-6 bg-emerald-900/95 border border-emerald-500 text-emerald-100 rounded-2xl text-sm font-bold flex items-center gap-3 animate-fade-in shadow-2xl z-50">
            <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
            <span>설정이 성공적으로 저장되었습니다!</span>
          </div>
        )}
      </div>
    );
  }
  if (isExited) {
    return (
      <div className="h-screen w-full bg-gradient-to-br from-[#0c1824] via-[#102a45] to-[#0a192f] text-slate-200 flex flex-col justify-between p-8 select-none relative overflow-hidden">
        {/* Desktop simulation background with subtle grid and icons */}
        <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none"></div>

        {/* Top bar */}
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
            <span className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-300">
              {schoolConfig.schoolName} {schoolConfig.currentGrade}학년 {schoolConfig.currentClass}반
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs font-mono text-emerald-400 font-bold">{timeString}</span>
          </div>

          <div className="flex items-center gap-2">
            {pendingAnnouncements.length > 0 && (
              <button 
                onClick={() => setIsExited(false)}
                className="px-3.5 py-2 bg-rose-600/90 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md animate-bounce flex items-center gap-1.5 cursor-pointer"
                title="쉬는 시간 예약 알림 확인하기"
              >
                <Bell size={13} />
                예약 대기열 ({pendingAnnouncements.length}건 대기중)
              </button>
            )}
            <button
              onClick={() => {
                // Trigger test popup in desktop mode
                setAnnouncement("🔔 [테스트] 교무실에서 전달사항이 도착했습니다.\n바탕화면 모드에서 자동으로 팝업이 호출되었습니다!");
                setIsPopupOpen(true);
                setIsExited(false);
                playNeonAlertSound();
                speakAnnouncementText("안내 말씀 드립니다. 바탕화면 모드에서 자동으로 팝업이 호출되었습니다.");
              }}
              className="px-4 py-2 bg-amber-600/80 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow cursor-pointer flex items-center gap-1.5"
            >
              <Bell size={14} />
              테스트 알림 호출
            </button>
            <button 
              onClick={() => setIsExited(false)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer flex items-center gap-2"
            >
              <Maximize size={15} />
              알림판 전체화면 복원
            </button>
          </div>
        </div>

        {/* Center message */}
        <div className="flex flex-col items-center justify-center text-center space-y-4 z-10 my-auto">
          <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center text-4xl shadow-2xl">
            🖥️
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">교실 바탕화면 / 판서 모드 실행 중</h2>
          <p className="text-sm text-slate-400 max-w-md leading-relaxed break-keep">
            현재 알림판이 바탕화면 모드로 전환되었습니다. 선생님들의 수업 및 판서 작업을 방해하지 않으며, <strong className="text-emerald-400">새로운 공지나 호출이 오면 소리와 함께 화면이 즉시 자동으로 팝업</strong>됩니다.
          </p>
          <div className="text-xs text-slate-500 font-mono bg-black/30 px-4 py-2 rounded-xl border border-white/5 mt-2">
            ※ .exe 교실 앱 실행 시에는 이 화면 대신 윈도우 실제 바탕화면으로 즉시 최소화/숨김 처리됩니다.
          </div>
        </div>

        {/* Bottom bar simulation */}
        <div className="flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-4 z-10">
          <div className="flex items-center gap-2 font-mono">
            <span className="text-slate-500">상태:</span>
            <span className="text-emerald-400 font-bold">백그라운드 알림 대기중</span>
          </div>
          <button 
            onClick={() => setIsExited(false)}
            className="text-slate-400 hover:text-white underline cursor-pointer text-xs"
          >
            전자칠판 알림판 화면으로 돌아가기 →
          </button>
        </div>
      </div>
    );
  }

  const renderMealList = (mealData: any) => {
    if (!mealData) return null;
    if (Array.isArray(mealData)) {
      return mealData.map((item, i) => <div key={i}>{item}</div>);
    }
    if (typeof mealData === 'string') {
      return mealData.split('\n').map((item, i) => <div key={i}>{item}</div>);
    }
    return String(mealData);
  };

  const parsedCall = (() => {
    if (!announcement || !announcement.includes('[대상:')) return null;
    
    const targetMatch = announcement.match(/\[대상:\s*(.*?)\]/);
    const locationMatch = announcement.match(/\n장소:\s*(.*?)(?=\n\(|$)/);
    const teacherMatch = announcement.match(/\n\((.*?)\s*선생님 호출\)$/);
    
    if (targetMatch && locationMatch) {
      const target = targetMatch[1];
      const location = locationMatch[1];
      const teacher = teacherMatch ? teacherMatch[1] : '';
      
      const msgMatch = announcement.match(/호출 내용:\s*([\s\S]*?)\n장소:/);
      const message = msgMatch ? msgMatch[1] : '';
      
      return { target, message, location, teacher };
    }
    
    return null;
  })();


  const th = (() => {
    let t = schoolConfig.classroomTheme || 'default';
    if (t === 'auto') {
      const currentH = currentTime.getHours();
      t = (currentH >= 18 || currentH < 6) ? 'dark' : 'default';
    }

    if (t === 'light') {
      return {
        mainBg: 'bg-slate-50', mainBorder: 'border-slate-300', textMain: 'text-slate-800',
        headerBg: 'bg-white', headerBorder: 'border-slate-200', 
        homeBtn: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300',
        schoolName: 'text-blue-600',
        title: 'text-slate-800',
        timeText: 'text-slate-800', dateText: 'text-blue-600',
        sectionBg: 'bg-white', sectionBorder: 'border-slate-200 shadow-md',
        sectionIcon: 'text-blue-500', sectionTitle: 'text-blue-700',
        tableHeader: 'bg-slate-100 border-slate-200 text-slate-700',
        tableRow: 'border-slate-200 text-slate-800',
        tableRowHover: 'hover:bg-slate-50',
        periodText: 'text-slate-500', subjectText: 'text-slate-900',
        mealBoxBg: 'bg-slate-50', mealBoxBorder: 'border-slate-200',
        mealTitle: 'text-slate-700', mealText: 'text-slate-600',
      };
    } else if (t === 'dark') {
      return {
        mainBg: 'bg-[#0a0a0a]', mainBorder: 'border-[#1a1a1a]', textMain: 'text-white',
        headerBg: 'bg-[#111]', headerBorder: 'border-[#222]', 
        homeBtn: 'bg-[#222] hover:bg-[#333] text-slate-300 border-[#333]',
        schoolName: 'text-slate-400',
        title: 'text-white',
        timeText: 'text-slate-100', dateText: 'text-slate-400',
        sectionBg: 'bg-[#111]', sectionBorder: 'border-[#222]',
        sectionIcon: 'text-slate-300', sectionTitle: 'text-slate-300',
        tableHeader: 'bg-[#1a1a1a] border-[#222] text-slate-300',
        tableRow: 'border-[#222] text-slate-300',
        tableRowHover: 'hover:bg-[#1a1a1a]',
        periodText: 'text-slate-500', subjectText: 'text-slate-100',
        mealBoxBg: 'bg-[#151515]', mealBoxBorder: 'border-[#222]',
        mealTitle: 'text-slate-400', mealText: 'text-slate-300',
      };
    } else {
      return {
        mainBg: 'bg-[#1e382b]', mainBorder: 'border-[#2b4c3b]', textMain: 'text-white',
        headerBg: 'bg-[#162d22]/60', headerBorder: 'border-emerald-900/60', 
        homeBtn: 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border-emerald-800',
        schoolName: 'text-emerald-400',
        title: 'text-white',
        timeText: 'text-emerald-50', dateText: 'text-emerald-400',
        sectionBg: 'bg-[#162d22]/40', sectionBorder: 'border-emerald-900/40 shadow-sm',
        sectionIcon: 'text-emerald-400', sectionTitle: 'text-emerald-300',
        tableHeader: 'bg-[#112017] border-emerald-900 text-emerald-200',
        tableRow: 'border-emerald-900/50 text-emerald-100',
        tableRowHover: 'hover:bg-[#112017]/50',
        periodText: 'text-emerald-600', subjectText: 'text-white',
        mealBoxBg: 'bg-[#162d22]/80', mealBoxBorder: 'border-emerald-900/60',
        mealTitle: 'text-emerald-400', mealText: 'text-emerald-200',
      };
    }
  })();
  return (
    <div 
      className={`h-screen w-full font-sans flex flex-col select-none overflow-hidden relative shadow-2xl border-4 transition-colors duration-1000 ${th.mainBg} ${th.textMain} ${th.mainBorder}`}
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      
      <header className={`h-20 px-8 flex items-center justify-between border-b shrink-0 transition-colors duration-1000 ${th.headerBg} ${th.headerBorder}`}>
        <div className="flex items-center gap-4">
          {appEnvMode !== 'class' && (
          <button 
            onClick={handleGoHome} 
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${th.homeBtn}`} 
            title="홈 화면으로 이동 및 고정 설정 해제"
            style={{ WebkitAppRegion: 'no-drag' } as any}
          >
            🏠 홈 (고정 해제)
          </button>
          )}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium tracking-wider ${th.schoolName}`}>{schoolConfig.schoolName}</span>
              <span className="text-[10px] font-mono text-emerald-400/80 bg-black/40 px-1.5 py-0.2 rounded border border-white/10 font-bold">{APP_VERSION}</span>{renderUpdateBadge()}
            </div>
            <div className="flex items-center gap-3">
              <h1 className={`text-2xl font-black tracking-tight drop-shadow-md ${th.title}`}>
                {schoolConfig.currentGrade}학년 {schoolConfig.currentClass}반 알림판
              </h1>
              <span className="text-[11px] font-bold text-emerald-300 bg-black/30 px-2.5 py-0.5 rounded-md border border-white/10">
                {getCurrentPeriodText()}
              </span>
              {schoolConfig.forcePopupDuringClass && (
                <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-md" title="관리자 설정: 수업 중에도 즉시 강제 팝업이 활성화되어 있습니다">
                  ⚡ 수업 중 팝업 허용됨
                </span>
              )}
              <button
                onClick={() => {
                  setViewMode('select');
                }}
                className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
                title="학년/반 변경하기"
                style={{ WebkitAppRegion: 'no-drag' } as any}
              >
                🔄 반 변경
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right relative">
            {pendingAnnouncements.length > 0 && (
              <div className="absolute -top-6 right-0 bg-rose-600/90 backdrop-blur border border-rose-400 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-lg animate-bounce flex items-center gap-1">
                <Bell size={10} /> 새 알림 대기중 ({pendingAnnouncements.length})
              </div>
            )}
            <div className={`text-5xl font-black tracking-widest font-mono mb-1 drop-shadow-sm ${th.timeText}`}>{timeString}</div>
            <div className={`text-sm font-semibold tracking-wide ${th.dateText}`}>{dateString}</div>
          </div>
          <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <button 
              onClick={toggleFullScreen}
              className="px-3 py-2.5 rounded-xl bg-blue-950/80 hover:bg-blue-900 text-blue-200 text-xs font-bold border border-blue-700/60 shadow-inner cursor-pointer flex items-center gap-1 transition-colors"
              title="전체화면 전환"
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />} 
              {isFullscreen ? '원래화면' : '전체화면'}
            </button>
            {announcement !== '조례사항 없습니다.\n오늘 하루도 즐겁게 열심히 공부합시다~' && (
              <button 
                onClick={() => setIsPopupOpen(true)}
                className="px-3 py-2.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-200 text-xs font-bold border border-amber-700/60 shadow-inner cursor-pointer flex items-center gap-1 animate-fade-in"
                title="현재 전달사항 다시 보기"
              >
                <Bell size={16} /> 전달사항 보기
              </button>
            )}
            <button 
              onClick={handleExitApp}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 hover:text-white transition-colors border border-rose-800/60 shadow-inner text-xs font-bold cursor-pointer"
              title="바탕화면으로 나가기 (숨기기)"
            >
              <LogOut size={18} />
              숨기기 (바탕화면)
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 grid grid-cols-12 gap-8 overflow-hidden" style={{ WebkitAppRegion: 'no-drag' } as any}>
        
        <section className={`col-span-7 flex flex-col rounded-3xl p-6 border h-full transition-colors duration-1000 ${th.sectionBg} ${th.sectionBorder}`}>
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <BookOpen size={20} className={th.sectionIcon} />
              <h2 className={`text-base font-bold ${th.sectionTitle}`}>오늘의 시간표</h2>
            </div>
            <span className={`text-xs font-mono font-bold ${th.schoolName}`}>{getCurrentPeriodText()}</span>
          </div>
          
          <div className="grid grid-cols-4 gap-4 flex-1 min-h-0 pb-2">
            {[
              { period: '1교시', time: formatScheduleString(getScheduleForPeriod(1)), subject: todayTimetableObj[1] },
              { period: '2교시', time: formatScheduleString(getScheduleForPeriod(2)), subject: todayTimetableObj[2] },
              { period: '3교시', time: formatScheduleString(getScheduleForPeriod(3)), subject: todayTimetableObj[3] },
              { period: '4교시', time: formatScheduleString(getScheduleForPeriod(4)), subject: todayTimetableObj[4] },
              { period: '5교시', time: formatScheduleString(getScheduleForPeriod(5)), subject: todayTimetableObj[5] },
              { period: '6교시', time: formatScheduleString(getScheduleForPeriod(6)), subject: todayTimetableObj[6] },
              { period: '7교시', time: formatScheduleString(getScheduleForPeriod(7)), subject: todayTimetableObj[7] },
            ].map((item, idx) => {
              if (!item.subject) return null;
              
              const isCurrent = (() => {
                const now = new Date();
                const nowTotal = now.getHours() * 60 + now.getMinutes();
                const [sh, sm] = item.time.split(' - ')[0].split(':').map(Number);
                const [eh, em] = item.time.split(' - ')[1].split(':').map(Number);
                const startTotal = sh * 60 + sm;
                const endTotal = eh * 60 + em;
                return nowTotal >= startTotal && nowTotal < endTotal;
              })();

              const colors = [
                'bg-[#fefce8] text-slate-800 rotate-[0.5deg]',
                'bg-[#fff1f2] text-slate-800 rotate-[-0.8deg]',
                'bg-[#f0fdf4] text-slate-800 rotate-[1.0deg]',
                'bg-[#f0f9ff] text-slate-800 rotate-[-0.5deg]',
                'bg-[#fdf4ff] text-slate-800 rotate-[0.7deg]',
                'bg-[#fff7ed] text-slate-800 rotate-[-0.3deg]'
              ];
              const effectiveDay = (currentDayOfWeekStr >= '1' && currentDayOfWeekStr <= '5') ? currentDayOfWeekStr : '1';
              const detailKey = `${currentKey}-${effectiveDay}-${idx + 1}`;
              const detail = timetableDetails[detailKey] 
                || timetableDetails[`${currentKey}-${currentDayOfWeekStr}-${idx + 1}`]
                || timetableDetails[`${currentKey}-1-${idx + 1}`]
                || timetableDetails[`${currentKey}-${idx + 1}`];
              const hasDetail = detail && Boolean(detail.location || detail.memo);
              return (
                <div 
                  key={idx} 
                  onClick={() => {
                    setSubjectModal({
                      isOpen: true,
                      period: idx + 1,
                      subject: item.subject,
                      location: detail?.location || '',
                      memo: detail?.memo || ''
                    });
                  }}
                  className={`${colors[idx % colors.length]} rounded-3xl p-4 flex flex-col shadow-xl font-handwriting transition-transform hover:scale-105 duration-200 relative border border-black/5 h-full cursor-pointer`}
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-6 bg-amber-400/40 rotate-2 shadow-sm border border-amber-200/20 backdrop-blur-sm z-10"></div>
                  
                  <div className="flex justify-between items-start font-sans px-1 relative z-0">
                    <span className="text-sm font-bold opacity-70 mt-1">{item.period}</span>
                    <div className="flex items-center gap-1.5">
                      {hasDetail && <FileText size={15} className="text-amber-700 opacity-90" />}
                      {isCurrent && (
                        <span className="flex items-center gap-1 bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow">
                          <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping"></span>
                          수업중
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center py-2 px-1 relative z-0">
                    <div className="text-5xl mb-3 opacity-90 drop-shadow-sm">{getSubjectIcon(item.subject)}</div>
                    <div className="text-2xl font-black tracking-tight break-keep leading-snug text-center">{item.subject}</div>
                    {detail?.location && (
                      <div className="mt-2 text-xs font-sans font-black text-emerald-950 bg-emerald-100/90 border border-emerald-400/60 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                        <MapPin size={13} className="text-emerald-700"/>
                        <span>{detail.location}</span>
                      </div>
                    )}
                    {detail?.memo && (
                      <div className="mt-2 w-full animate-fade-in relative z-20">
                        <div className="text-xs font-sans font-bold text-rose-950 bg-rose-50 border border-rose-300 p-2 rounded-xl leading-snug w-full break-keep shadow-sm">
                          <div className="flex items-center gap-1 mb-1 text-rose-600 font-black text-[10px]">
                            <Bell size={12} className="animate-pulse shrink-0" />
                            <span>공지사항</span>
                          </div>
                          <div className="text-slate-800 text-[11px] leading-tight font-medium">
                            {detail.memo}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] text-center font-sans font-bold opacity-50 bg-black/5 rounded-full py-1.5 mt-auto w-full relative z-0">{item.time}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="col-span-5 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-4 shrink-0 px-2">
            <Utensils size={20} className={th.sectionIcon} />
            <h2 className={`text-base font-bold ${th.sectionTitle}`}>오늘의 급식</h2>
          </div>
          
          <div className="flex-1 grid grid-cols-2 gap-5 min-h-0">
            {/* Lunch Card */}
            <div className={`rounded-3xl p-6 border shadow-xl flex flex-col relative overflow-hidden group transition-colors duration-1000 ${th.tableHeader}`}>
              <div className="flex justify-center mb-8">
                <div className="bg-amber-900/40 border border-amber-800/50 text-amber-500 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  <Utensils size={14} /> 점심 식단
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center justify-start text-center">
                <div className={`text-xl md:text-2xl font-bold leading-[2.2] break-keep w-full flex flex-col gap-1 transition-colors duration-1000 ${th.textMain}`}>
                  {todayMealsObj?.lunch ? renderMealList(todayMealsObj.lunch) : <span className="text-emerald-600/60 italic text-sm">급식 정보가 없습니다.</span>}
                </div>
              </div>
              <div className="mt-6 text-center shrink-0">
                <span className={`text-[10px] font-bold tracking-[0.2em] transition-colors duration-1000 ${th.periodText}`}>LUNCH MENU</span>
              </div>
            </div>

            {/* Dinner Card */}
            <div className={`rounded-3xl p-6 border shadow-xl flex flex-col relative overflow-hidden group transition-colors duration-1000 ${th.tableHeader}`}>
              <div className="flex justify-center mb-8">
                <div className="bg-indigo-900/30 border border-indigo-800/50 text-indigo-400 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  <Moon size={14} /> 저녁 식단
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center justify-start text-center">
                <div className={`text-xl md:text-2xl font-bold leading-[2.2] break-keep w-full flex flex-col gap-1 transition-colors duration-1000 ${th.textMain}`}>
                  {todayMealsObj?.dinner ? renderMealList(todayMealsObj.dinner) : <span className="text-emerald-600/60 italic text-sm">해당 없음</span>}
                </div>
              </div>
              <div className="mt-6 text-center shrink-0">
                <span className={`text-[10px] font-bold tracking-[0.2em] transition-colors duration-1000 ${th.periodText}`}>DINNER MENU</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {subjectModal.isOpen && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            style={{ WebkitAppRegion: 'no-drag' } as any}
          >
            <div className="bg-[#1a1a1a] border border-amber-500/50 p-8 rounded-3xl w-full max-w-md shadow-2xl animate-fade-in relative text-white">
              <button 
                onClick={() => setSubjectModal({ ...subjectModal, isOpen: false })}
                className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
              
              <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-4">
                <div className="text-4xl">{getSubjectIcon(subjectModal.subject)}</div>
                <div>
                  <h3 className="text-2xl font-black text-amber-400">{subjectModal.period}교시 {subjectModal.subject}</h3>
                  <p className="text-xs text-slate-400 mt-1">교과 교실 및 간단한 수업 메모를 작성하세요.</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2 text-left">
                  <label className="text-sm font-bold text-slate-300 flex items-center gap-2"><MapPin size={16}/> 장소 (교과교실)</label>
                  <input 
                    type="text" 
                    value={subjectModal.location}
                    onChange={e => setSubjectModal({ ...subjectModal, location: e.target.value })}
                    className="w-full bg-[#111] border border-white/20 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-amber-400"
                    placeholder="예: 과학실, 체육관, 미술실 등"
                  />
                </div>
                
                <div className="space-y-2 text-left">
                  <label className="text-sm font-bold text-slate-300 flex items-center gap-2"><FileText size={16}/> 알림장/메모</label>
                  <textarea 
                    value={subjectModal.memo}
                    onChange={e => setSubjectModal({ ...subjectModal, memo: e.target.value })}
                    className="w-full h-32 bg-[#111] border border-white/20 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-amber-400 resize-none"
                    placeholder="예: 체육복 지참, 리코더 준비 등"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-2">
                <button 
                  onClick={() => setSubjectModal({ ...subjectModal, isOpen: false })}
                  className="px-6 py-3 bg-[#333] hover:bg-[#444] text-white rounded-xl text-sm font-bold transition-colors"
                >
                  취소
                </button>
                <button 
                  onClick={() => {
                    const detailKey = `${currentKey}-${currentDayOfWeekStr}-${subjectModal.period}`;
                    const newDetails = { ...timetableDetails, [detailKey]: { location: subjectModal.location, memo: subjectModal.memo } };
                    setTimetableDetails(newDetails);
                    
                    try {
                      localStorage.setItem('timetable_details', JSON.stringify(newDetails));
                    } catch(e) {}
                    
                    if (db) {
                       import("firebase/database").then(({ ref: dbRef, set }) => {
                         set(dbRef(db, 'globalData/timetableDetails'), newDetails).catch(console.error);
                       });
                    }
                    
                    setSubjectModal({ ...subjectModal, isOpen: false });
                  }}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-bold transition-colors shadow-lg"
                >
                  저장하기
                </button>
              </div>
            </div>
          </div>
        )}

      {viewMode === 'classroom' && pendingAnnouncements.length > 0 && (
        <div 
          className="absolute bottom-6 left-6 w-84 bg-[#162d22]/95 backdrop-blur-md border border-emerald-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-40 animate-fade-in"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <div className="bg-emerald-900/80 px-4 py-2.5 border-b border-emerald-500/30 flex items-center justify-between">
            <h3 className="text-xs font-bold text-emerald-100 flex items-center gap-1.5 drop-shadow">
              <Clock size={15} className="text-amber-300" /> 예약된 알림 대기열
            </h3>
            <span className="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-black animate-pulse shadow">{pendingAnnouncements.length}건</span>
          </div>

          <div className="px-3 pt-2">
            {isClassTime() && !schoolConfig.forcePopupDuringClass ? (
              <div className="text-[10px] text-amber-200 bg-amber-950/70 border border-amber-500/40 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                <span>현재 수업 진행 중 (쉬는 시간에 자동 팝업)</span>
              </div>
            ) : (
              <div className="text-[10px] text-emerald-200 bg-emerald-950/70 border border-emerald-500/40 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>{schoolConfig.forcePopupDuringClass ? "⚡ 즉시 강제 팝업 모드 활성" : "🔔 쉬는 시간 자동 팝업 대기"}</span>
              </div>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {pendingAnnouncements.map((ann) => (
              <div key={ann.id} className="bg-black/30 rounded-xl p-3 border border-emerald-900/60 flex flex-col gap-2 relative">
                <p className="text-xs text-emerald-100 line-clamp-2 font-medium leading-relaxed">{ann.text}</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[10px] text-emerald-400/80 font-mono">
                    {new Date(ann.time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 예약됨
                  </span>
                  <button 
                    onClick={() => {
                      setPendingAnnouncements(prev => {
                        const updated = prev.filter(a => a.id !== ann.id);
                        try { localStorage.setItem('pending_announcements_queue', JSON.stringify(updated)); } catch(e) {}
                        return updated;
                      });
                    }}
                    className="text-[10px] bg-rose-900/50 hover:bg-rose-800 text-rose-200 px-2.5 py-1 rounded-md border border-rose-800/60 transition-colors font-bold shadow-inner cursor-pointer"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 bg-black/40 border-t border-emerald-900/60 flex gap-2">
            <button 
              onClick={() => {
                if (window.confirm("예약된 알림 대기열을 모두 삭제하시겠습니까?")) {
                  setPendingAnnouncements([]);
                  try { localStorage.removeItem('pending_announcements_queue'); } catch(e) {}
                }
              }}
              className="px-2.5 py-2 bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-[11px] font-bold rounded-lg transition-colors border border-rose-800/60 cursor-pointer whitespace-nowrap"
              title="대기열 전체 비우기"
            >
              전체 비우기
            </button>
            <button 
              onClick={() => {
                const next = pendingAnnouncements[0];
                setPendingAnnouncements(prev => {
                  const remaining = prev.slice(1);
                  try { localStorage.setItem('pending_announcements_queue', JSON.stringify(remaining)); } catch(e) {}
                  return remaining;
                });
                
                if (next.duration) {
                  setCurrentAnnouncementDuration(Number(next.duration));
                } else {
                  setCurrentAnnouncementDuration(null);
                }

                const targetClassKey = `${schoolConfig.currentGrade}-${schoolConfig.currentClass}`;
                const currentTimeout = next.duration 
                  || (classPopupTimeouts[targetClassKey] !== undefined ? classPopupTimeouts[targetClassKey] : (schoolConfig.popupTimeout || 60));

                setAnnouncement(next.text);
                setIsPopupOpen(true);
                setIsExited(false);
                playNeonAlertSound();
                speakAnnouncementText(next.text);
                
                if ((window as any).electron && (window as any).electron.ipcRenderer) {
                  (window as any).electron.ipcRenderer.send('trigger-my-call', { timeout: currentTimeout });
                }
              }}
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors shadow-md border border-emerald-500 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Bell size={12} /> 지금 바로 띄우기
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isPopupOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClosePopupAndHide} 
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6 cursor-pointer"
            title="클릭하거나 터치하면 팝업이 닫힙니다."
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: -60 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 60 }}
              transition={{ type: "spring", damping: 15, stiffness: 200 }}
              className="relative w-full max-w-4xl bg-[#050505] border-4 border-[#ff0055] rounded-3xl p-12 shadow-[0_0_80px_#ff0055,inset_0_0_40px_#ff0055] flex flex-col items-center text-center overflow-hidden" 
              onClick={(e: any) => e.stopPropagation()}
            >
            
            <div className="absolute inset-0 border-8 border-transparent animate-neon-pulse pointer-events-none rounded-2xl"></div>
            
            <div className="flex items-center gap-4 text-[#ff0055] animate-bounce-slow mb-6">
              <ShieldAlert size={48} strokeWidth={2.5} />
              <h2 className="text-4xl font-black tracking-widest drop-shadow-[0_0_15px_#ff0055]">메시지</h2>
              <ShieldAlert size={48} strokeWidth={2.5} />
            </div>

            {parsedCall ? (
              <div className="w-full space-y-8 relative z-10 py-4">
                {(() => {
                  const targets = parsedCall.target.split(',').map((s: string) => s.trim());
                  if (parsedCall.target === '학급 전체') {
                    return (
                      <div className="inline-block px-8 py-3 bg-[#1a0005] border-2 border-[#ff0055]/50 rounded-full text-3xl font-black text-white shadow-[0_0_30px_#ff0055]">
                        <span className="text-rose-300">대상: </span> 
                        <span className="text-amber-400">학급 전체</span>
                      </div>
                    );
                  } else if (targets.length === 1) {
                    return (
                      <div className="inline-block px-8 py-3 bg-[#1a0005] border-2 border-[#ff0055]/50 rounded-full text-3xl font-black text-white shadow-[0_0_30px_#ff0055]">
                        <span className="text-rose-300">대상: </span> 
                        <span className="text-white">{targets[0]}</span>
                      </div>
                    );
                  } else {
                    return (
                      <div className="flex flex-col items-center gap-3 w-full">
                        <div className="flex flex-wrap justify-center gap-3">
                          {targets.map((t: string) => (
                            <div key={t} className="px-5 py-3 bg-[#1a0005] border-2 border-[#ff0055]/50 rounded-2xl text-2xl font-black text-white shadow-[0_0_20px_#ff0055] flex items-center gap-2">
                              <User size={24} className="text-rose-400" />
                              {t}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                })()}
                
                <div className="bg-[#111] border border-white/10 rounded-3xl p-8 shadow-inner my-6 w-full text-center">
                  <div className="text-4xl md:text-5xl font-black text-white leading-[1.4] break-keep whitespace-pre-wrap break-words mx-auto">
                    {parsedCall.message}
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-12 text-2xl font-bold pt-6 border-t border-white/10">
                  <div className="flex items-center gap-3 bg-[#111] px-6 py-4 rounded-2xl border border-white/10 shadow-lg">
                    <MapPin className="text-[#ff0055]" size={28} />
                    <span className="text-slate-300">장소: <span className="text-white ml-2">{parsedCall.location}</span></span>
                  </div>
                  {parsedCall.teacher && parsedCall.teacher.trim() !== '' && (
                    <div className="flex items-center gap-3 bg-[#111] px-6 py-4 rounded-2xl border border-white/10 shadow-lg">
                      <User className="text-[#ff0055]" size={28} />
                      <span className="text-slate-300">호출 교사: <span className="text-white ml-2">{parsedCall.teacher} 선생님</span></span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full bg-[#111] border border-white/10 rounded-3xl p-10 shadow-inner z-10 relative my-8 max-w-4xl mx-auto">
                <div className="text-4xl md:text-5xl font-black text-white leading-[1.4] break-keep whitespace-pre-wrap text-center break-words mx-auto">
                  {announcement}
                </div>
              </div>
            )}

            <div className="flex flex-col items-center gap-4 w-full mt-8">
              {popupCountdown !== null && (
                <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1a0005] border border-[#ff0055]/50 text-rose-300 text-sm font-bold font-mono shadow-[0_0_15px_rgba(255,0,85,0.3)]">
                  <Clock size={16} className="text-[#ff0055] animate-pulse" />
                  <span>자동 닫힘까지 <strong className="text-white text-base font-black">{popupCountdown}</strong>초 남음</span>
                </div>
              )}
              <button 
                onClick={handleClosePopupAndHide}
                className="px-12 py-5 bg-[#ff0055] hover:bg-[#ff3377] text-white font-black rounded-2xl shadow-[0_0_20px_#ff0055] transition-all text-xl flex items-center gap-3 cursor-pointer active:scale-95"
              >
                <X size={28} strokeWidth={3} />
                확인 (닫기)
              </button>
            </div>
            
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

