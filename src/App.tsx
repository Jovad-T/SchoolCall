import React, { useState, useEffect, useRef } from 'react';
import { Bell, Clock, Settings, X, Calendar, Utensils, BookOpen, Volume2, ShieldAlert, LogOut, Send, Monitor, Smartphone, Wrench, ArrowLeft, CheckCircle2, User, MapPin, Layers, Plus, Trash2, Edit3, Upload, FileText, Image as ImageIcon, Database, Key, Lock, Loader2 } from 'lucide-react';

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

export default function App() {
  const defaultMode = localStorage.getItem('default_view_mode') as 'classroom' | 'remote' | 'admin' | null;
  const [viewMode, setViewMode] = useState<'select' | 'classroom' | 'remote' | 'admin'>(defaultMode || 'select');
  
  const [currentTime, setCurrentTime] = useState(new Date());

  const [schoolConfig, setSchoolConfig] = useState(() => {
    const saved = localStorage.getItem('school_config');
    const parsed = saved ? JSON.parse(saved) : {};
    return { 
      schoolName: parsed.schoolName || '사직여자고등학교', 
      gradeCounts: parsed.gradeCounts || { 1: 8, 2: 8, 3: 8 },
      currentGrade: parsed.currentGrade || 2, 
      currentClass: parsed.currentClass || 8,
      neisApiKey: parsed.neisApiKey || '',
      geminiApiKey: parsed.geminiApiKey || '',
      eduCode: parsed.eduCode || 'C10',
      schoolCode: parsed.schoolCode || '7150144',
      adminPin: parsed.adminPin || '0000'
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

  const [announcement, setAnnouncement] = useState('조례사항 없습니다.\n오늘 하루도 즐겁게 열심히 공부합시다~');
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [sendSuccessToast, setSendSuccessToast] = useState(false);
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);
  const [isExited, setIsExited] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedCallMessage, setSelectedCallMessage] = useState<string>('교무실로 오세요');
  const [teacherName, setTeacherName] = useState<string>('선생님 이름');
  const [locationName, setLocationName] = useState<string>('교무실');
  const [customAnnouncement, setCustomAnnouncement] = useState<string>('조례사항 없습니다.\n오늘 하루도 즐겁게 열심히 공부합시다~');

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
  const [adminPinInput, setAdminPinInput] = useState(schoolConfig.adminPin);

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

  const todayStr = `${currentTime.getFullYear()}${String(currentTime.getMonth() + 1).padStart(2, '0')}${String(currentTime.getDate()).padStart(2, '0')}`;
  const currentKey = `${schoolConfig.currentGrade}-${schoolConfig.currentClass}`;
  
  let todayMealsObj = meals[todayStr];
  if (!todayMealsObj && (meals as any).lunch) todayMealsObj = meals as any;
  if (!todayMealsObj) todayMealsObj = { lunch: ['오늘의 급식 정보가 없습니다.'], dinner: ['오늘의 급식 정보가 없습니다.'] };

  const currentDayOfWeekStr = String(currentTime.getDay());
  let todayTimetableObj = classTimetables[currentKey]?.[currentDayOfWeekStr];
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
    if (!db) return;
    const globalRef = ref(db, 'globalData');
    const unsubscribe = onValue(globalRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        if (data.schoolConfig) setSchoolConfig(data.schoolConfig);
        if (data.classRosters) setClassRosters(data.classRosters);
        if (data.dailySchedule) setDailySchedule(data.dailySchedule);
        if (data.classTimetables) setClassTimetables(data.classTimetables);
        if (data.meals) setMeals(data.meals);
      }
    });
    return () => unsubscribe();
  }, []);

  const isClassTime = () => {
    const currentH = currentTime.getHours();
    const currentM = currentTime.getMinutes();
    const currentTotalM = currentH * 60 + currentM;

    for (let p = 1; p <= 7; p++) {
      const sch = dailySchedule[p];
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

  useEffect(() => {
    if (!db || viewMode !== 'classroom') return;

    const classKey = `${schoolConfig.currentGrade}-${schoolConfig.currentClass}`;
    const announceRef = ref(db, `announcements/${classKey}`);

    const unsubscribe = onValue(announceRef, (snapshot) => {
      const data = snapshot.val();
      
      if (data) {
        setAnnouncement(data.text);
        if (data.time > lastSyncTimeRef.current) {
          lastSyncTimeRef.current = data.time;
          
          if (isClassTime()) {
            console.log("현재 수업 시간이므로 알림이 차단되었습니다.");
            return;
          }

          setIsPopupOpen(true);
          setIsExited(false);
          playNeonAlertSound(); 
          
          if ((window as any).electron && (window as any).electron.ipcRenderer) {
            (window as any).electron.ipcRenderer.send('trigger-my-call');
          }
        }
      }
    });

    return () => unsubscribe();
  }, [viewMode, schoolConfig.currentGrade, schoolConfig.currentClass, dailySchedule]);

  const handleExitApp = () => {
    if ((window as any).electron && (window as any).electron.ipcRenderer) {
      (window as any).electron.ipcRenderer.send('hide-window');
    } else {
      setIsExited(true);  
    }
  };

  const handleClosePopupAndHide = () => {
    setIsPopupOpen(false);
  };

  useEffect(() => {
    if (isPopupOpen && viewMode === 'classroom') {
      const timer = setTimeout(() => {
        handleClosePopupAndHide();
      }, 60000);
      return () => clearTimeout(timer);
    }
  }, [isPopupOpen, viewMode]);

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
      setAdminGeminiApiKey(schoolConfig.geminiApiKey || '');
      setAdminEduCode(schoolConfig.eduCode);
      setAdminSchoolCode(schoolConfig.schoolCode);
      setAdminPinInput(schoolConfig.adminPin);
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
            newTimetable[row.PERIO] = row.ITRT_CNTNT.replace(/\*/g, '');
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
      console.error(err);
      alert('❌ NEIS 연동 오류 발생');
    } finally {
      setIsNeisLoading(false);
    }
  };

  const handleTimetableImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
첨부된 시간표 이미지에서 **모든 날짜(월~금)**의 1교시부터 7교시까지의 수업 과목을 전부 추출해.
현재 연도는 ${currentTime.getFullYear()}년이야. 문서에 적힌 날짜(예: 8-24)를 조합해 "YYYYMMDD" 형태를 키(key)로 생성해.

[엄격한 추출 규칙]
1. 시간표 칸 안에 슬래시(/) 뒤에 붙은 교사 이름이나 장소는 완벽하게 제거해.
2. 과목명 앞의 A, B, C 등 이동수업 알파벳 제거해.
3. 띄어쓰기를 예쁘게 교정해 (예: 프랑스어회화 -> 프랑스어 회화)
4. 빈칸은 "-" 로 표시해.
5. 반드시 마크다운 백틱 없이 순수 JSON 포맷으로만 응답해.
형식 예시:
{
  "20260824": { "1": "진로", "2": "독서", ... "7": "창체" },
  "20260825": { "1": "수학", "2": "체육", ... "7": "-" }
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
      console.error(err);
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
      console.error(err);
      alert(`❌ 식단표 인식 실패: ${err.message}`);
    } finally {
      setIsNeisLoading(false);
      e.target.value = '';
    }
  };

  const sendFirebaseMessage = (msg: string) => {
    if (!db) {
      alert("❌ Firebase가 연결되지 않아 로컬에만 저장됩니다.");
      localStorage.setItem('class_announcement', msg);
      setAnnouncement(msg);
      setSendSuccessToast(true);
      setTimeout(() => setSendSuccessToast(false), 3000);
      return;
    }

    const classKey = `${schoolConfig.currentGrade}-${schoolConfig.currentClass}`;
    set(ref(db, `announcements/${classKey}`), {
      text: msg,
      time: Date.now()
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
    const finalMsg = `[대상: ${selectedStudent || '학급 전체'}]\n호출 내용: ${selectedCallMessage}\n장소: ${locationName}\n(${teacherName} 선생님 호출)`;
    sendFirebaseMessage(finalMsg);
  };

  const handleSendClassAnnouncement = () => {
    if (!customAnnouncement.trim()) return;
    sendFirebaseMessage(customAnnouncement.trim());
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
      adminPin: adminPinInput.trim() || '0000'
    };
    
    setSchoolConfig(newConfig);
    setClassRosters(tempClassRosters);
    setDailySchedule(tempDailySchedule);
    setClassTimetables(tempClassTimetables);
    setMeals(tempMeals);

    if (db) {
      const cleanData = JSON.parse(JSON.stringify({
        schoolConfig: newConfig,
        classRosters: tempClassRosters,
        dailySchedule: tempDailySchedule,
        classTimetables: tempClassTimetables,
        meals: tempMeals
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
      <div className="h-screen w-full bg-[#162d22] text-white flex flex-col items-center justify-center p-6 select-none overflow-y-auto relative">
        <div className="max-w-4xl w-full text-center space-y-12 my-auto pt-16 relative z-10">
          <div className="space-y-4">
            <div className="inline-block px-5 py-2 rounded-full bg-emerald-900/80 text-emerald-300 text-xs font-bold border border-emerald-600/60 shadow-md">
              {schoolConfig.schoolName}
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white drop-shadow-lg">
              학급 알림판 & 스마트 제어 시스템
            </h1>
            <p className="text-emerald-300/80 text-sm">사용하실 모드를 선택해 주세요.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="bg-[#1e382b] border-2 border-emerald-700/60 rounded-3xl p-8 flex flex-col items-center text-center shadow-xl h-full relative group hover:-translate-y-1 transition-transform">
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

            <button 
              onClick={() => setPinModal({ isOpen: true, input: '', error: '' })}
              className="group bg-[#1e382b] hover:bg-[#254636] border-2 border-emerald-700/60 hover:border-emerald-400 rounded-3xl p-8 flex flex-col items-center text-center transition-all shadow-xl cursor-pointer hover:-translate-y-1 relative h-full"
            >
              <div className="absolute top-4 right-4 text-emerald-500/50">
                <Lock size={16} />
              </div>
              <div className="w-16 h-16 rounded-2xl bg-indigo-900/80 flex items-center justify-center text-indigo-300 mb-6 group-hover:scale-110 transition-transform shadow-inner">
                <Wrench size={36} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2 break-keep">관리자 모드</h2>
              <p className="text-xs text-indigo-200/70 leading-relaxed mt-1 mb-auto break-keep">
                명단 업로드, NEIS 연동 및 보안<br/>암호 등 환경을 설정합니다.
              </p>
            </button>
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
      <div className="h-screen w-full bg-[#111111] text-white flex flex-col select-none overflow-y-auto">
        <header className="h-16 px-6 bg-[#161616] border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={handleGoHome} className="p-2 rounded-xl bg-white/10 text-emerald-300 hover:bg-white/20 cursor-pointer flex items-center gap-1 text-xs font-bold" title="홈 화면으로 이동 및 고정 해제">
              <ArrowLeft size={16} /> 홈으로 (고정 해제)
            </button>
            <h1 className="text-lg font-bold text-amber-400">📱 {schoolConfig.currentGrade}학년 {schoolConfig.currentClass}반 스마트 리모컨</h1>
          </div>
          <div className="text-xs text-emerald-400 font-mono">{timeString}</div>
        </header>

        <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-8 pb-12">
          
          <section className="grid grid-cols-2 gap-4">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 space-y-2">
              <label className="text-[11px] font-bold text-slate-400 tracking-wider">GRADE (학년)</label>
              <select 
                value={schoolConfig.currentGrade}
                onChange={(e) => setSchoolConfig({ ...schoolConfig, currentGrade: Number(e.target.value) })}
                className="w-full bg-[#111] border border-white/20 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-amber-400"
              >
                {[1, 2, 3].map(g => <option key={g} value={g}>{g}학년</option>)}
              </select>
            </div>

            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 space-y-2">
              <label className="text-[11px] font-bold text-slate-400 tracking-wider">CLASS (반)</label>
              <select 
                value={schoolConfig.currentClass}
                onChange={(e) => setSchoolConfig({ ...schoolConfig, currentClass: Number(e.target.value) })}
                className="w-full bg-[#111] border border-white/20 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-amber-400"
              >
                {Array.from({ length: schoolConfig.gradeCounts[schoolConfig.currentGrade as 1 | 2 | 3] || 8 }, (_, i) => i + 1).map(c => <option key={c} value={c}>{c}반</option>)}
              </select>
            </div>
          </section>

          <section className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-400 tracking-wider">SELECT STUDENT ({schoolConfig.currentGrade}학년 {schoolConfig.currentClass}반 학생 명렬 - 총 {currentStudents.length}명)</label>
              <span className="text-xs text-amber-400 font-bold">{selectedStudent || '전체 선택됨'}</span>
            </div>
            
            {currentStudents.length > 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 overflow-y-visible pr-1">
                {currentStudents.map((stu, i) => {
                  const isSelected = selectedStudent === stu;
                  return (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setSelectedStudent(isSelected ? '' : stu)}
                      className={`py-3 px-2 rounded-2xl text-xs font-bold transition-all border cursor-pointer truncate ${isSelected ? 'bg-rose-600 text-white border-rose-500 shadow-lg scale-105' : 'bg-[#222] text-slate-300 border-white/10 hover:bg-[#2a2a2a]'}`}
                    >
                      {stu}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                해당 학급에 등록된 학생 명렬이 없습니다. 관리자 모드에서 CSV를 업로드해 주세요.
              </div>
            )}
          </section>

          <section className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 space-y-3">
            <label className="text-xs font-bold text-slate-400 tracking-wider">CALL MESSAGE (호출 메시지)</label>
            <div className="space-y-2">
              {['교무실로 오세요', '수행평가 평가지 가지고 오세요', '상담이 있으니 교무실로 오세요', '프린트물을 챙겨가세요', '긴급 호출입니다. 즉시 교무실로 오세요'].map((msg) => {
                const isSelected = selectedCallMessage === msg;
                return (
                  <div
                    key={msg}
                    onClick={() => setSelectedCallMessage(msg)}
                    className={`w-full p-4 rounded-2xl text-sm font-bold border transition-all cursor-pointer flex items-center justify-between ${isSelected ? 'bg-[#251515] border-rose-500 text-rose-400 shadow-md' : 'bg-[#161616] border-white/10 text-slate-300 hover:bg-[#222]'}`}
                  >
                    <span>{msg}</span>
                    {isSelected && <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></span>}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 space-y-2">
              <label className="text-[11px] font-bold text-slate-400 tracking-wider">TEACHER (담당 선생님)</label>
              <input 
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="w-full bg-[#111] border border-white/20 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-amber-400"
                placeholder="선생님 성함"
              />
            </div>

            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 space-y-2">
              <label className="text-[11px] font-bold text-slate-400 tracking-wider">LOCATION (호출 장소)</label>
              <input 
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="w-full bg-[#111] border border-white/20 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-amber-400"
                placeholder="장소 입력 (예: 교무실)"
              />
            </div>
          </section>

          <section className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 space-y-4">
            <label className="text-xs font-bold text-slate-400 tracking-wider">학급 전달사항 (전체 공지 메시지)</label>
            <textarea 
              value={customAnnouncement}
              onChange={(e) => setCustomAnnouncement(e.target.value)}
              className="w-full h-28 bg-[#111] border border-white/20 rounded-2xl p-4 text-sm text-white outline-none focus:border-blue-500 resize-none leading-relaxed"
              placeholder="학생들에게 전달할 내용을 입력하세요..."
            />
            <button 
              type="button"
              onClick={handleSendClassAnnouncement}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg transition-all text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send size={16} /> 전달사항 보내기 ✈
            </button>
          </section>

          <button 
            type="button"
            onClick={handleSendSmartCall}
            className="w-full py-5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-3xl shadow-2xl transition-all text-lg tracking-wider cursor-pointer active:scale-95 flex items-center justify-center gap-2"
          >
            <Bell size={24} /> SEND CALL ALERT
          </button>

          {sendSuccessToast && (
            <div className="p-4 bg-emerald-900/80 border border-emerald-500 text-emerald-200 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              <span>호출 및 전달사항이 전송되었습니다!</span>
            </div>
          )}

        </main>
      </div>
    );
  }

  if (viewMode === 'admin') {
    return (
      <div className="h-screen w-full bg-[#111a15] text-white flex flex-col select-none overflow-y-auto">
        <header className="h-16 px-6 bg-[#162d22] border-b border-emerald-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={handleGoHome} className="p-2 rounded-xl bg-emerald-950 text-emerald-300 hover:bg-emerald-900 cursor-pointer flex items-center gap-1 text-xs font-bold">
              <ArrowLeft size={16} /> 홈으로
            </button>
            <h1 className="text-lg font-bold text-indigo-300">⚙️ 관리자 환경설정 패널</h1>
          </div>
          <button onClick={handleSaveAdminSettings} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md">
            저장 후 달력 동기화
          </button>
        </header>

        <main className="flex-1 p-8 max-w-4xl mx-auto w-full space-y-8 pb-16">
          
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
            <h2 className="text-base font-bold text-indigo-300 flex items-center gap-2">🏫 학교명 및 학급/API 구조 세팅</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-300 font-bold mb-1 block">학교명</label>
                <input 
                  type="text" 
                  value={adminSchoolName} 
                  onChange={(e) => setAdminSchoolName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#111a15] text-white rounded-xl border border-emerald-900 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-300 font-bold mb-1 block">대시보드 표시 학년</label>
                  <select 
                    value={adminSelectedGrade} 
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setAdminSelectedGrade(val);
                      setEditTargetGrade(val);
                    }}
                    className="w-full px-3 py-2.5 bg-[#111a15] text-white rounded-xl border border-emerald-900 text-sm"
                  >
                    {[1, 2, 3].map(g => <option key={g} value={g}>{g}학년</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-bold mb-1 block">대시보드 표시 반</label>
                  <select 
                    value={adminSelectedClass} 
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setAdminSelectedClass(val);
                      setEditTargetClass(val);
                    }}
                    className="w-full px-3 py-2.5 bg-[#111a15] text-white rounded-xl border border-emerald-900 text-sm"
                  >
                    {Array.from({ length: adminGradeCounts[adminSelectedGrade as 1 | 2 | 3] || 8 }, (_, i) => i + 1).map(c => <option key={c} value={c}>{c}반</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-emerald-900/60">
              <label className="text-xs text-slate-300 font-bold mb-2 block">학년별 전체 학급 수 설정</label>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map(grade => (
                  <div key={grade} className="bg-[#111a15] p-3 rounded-xl border border-emerald-900 flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300">{grade}학년</span>
                    <input 
                      type="number" 
                      min="1" max="20"
                      value={adminGradeCounts[grade as 1 | 2 | 3]}
                      onChange={(e) => setAdminGradeCounts({ ...adminGradeCounts, [grade]: Number(e.target.value) })}
                      className="w-16 px-2 py-1 bg-[#1c2e25] text-white text-center rounded-lg border border-emerald-700 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-emerald-900/60 mt-4">
              <label className="text-xs text-slate-300 font-bold mb-2 flex items-center gap-1.5"><Key size={14} className="text-amber-400"/> 나이스(NEIS) & AI(Gemini) 인증키 연동</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                <div className="md:col-span-1">
                  <label className="text-[10px] text-slate-400 mb-1 block">교육청 코드</label>
                  <input type="text" value={adminEduCode} onChange={(e) => setAdminEduCode(e.target.value)} placeholder="예: C10 (부산)" className="w-full px-3 py-2 bg-[#111a15] text-white rounded-lg border border-emerald-900 text-xs" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] text-slate-400 mb-1 block">학교 표준코드</label>
                  <input type="text" value={adminSchoolCode} onChange={(e) => setAdminSchoolCode(e.target.value)} placeholder="예: 7150144 (사직여고)" className="w-full px-3 py-2 bg-[#111a15] text-white rounded-lg border border-emerald-900 text-xs" />
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">나이스 NEIS API KEY</label>
                  <input
                    type="password"
                    value={adminNeisApiKey}
                    onChange={(e) => setAdminNeisApiKey(e.target.value)}
                    placeholder="발급받은 NEIS API KEY를 입력하세요"
                    className="w-full px-4 py-2.5 bg-[#111a15] text-white rounded-xl border border-emerald-900 text-sm focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-indigo-300 font-bold mb-1 block">구글 Gemini API KEY (PDF/이미지 식단표 AI 분석용)</label>
                  <input
                    type="password"
                    value={adminGeminiApiKey}
                    onChange={(e) => setAdminGeminiApiKey(e.target.value)}
                    placeholder="Google AI Studio Gemini API 키 (AIzaSy...)"
                    className="w-full px-4 py-2.5 bg-[#111a15] text-white rounded-xl border border-indigo-900 text-sm focus:border-indigo-400 outline-none"
                  />
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

            <div className="flex items-center justify-between flex-wrap gap-4 bg-[#111a15] p-3 rounded-xl border border-emerald-900">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-emerald-300">확인/편집할 학급 선택:</span>
                <select 
                  value={editTargetGrade} 
                  onChange={(e) => setEditTargetGrade(Number(e.target.value))}
                  className="bg-[#1c2e25] text-white text-xs px-3 py-1.5 rounded-lg border border-emerald-700"
                >
                  {[1, 2, 3].map(g => <option key={g} value={g}>{g}학년</option>)}
                </select>
                <select 
                  value={editTargetClass} 
                  onChange={(e) => setEditTargetClass(Number(e.target.value))}
                  className="bg-[#1c2e25] text-white text-xs px-3 py-1.5 rounded-lg border border-emerald-700"
                >
                  {Array.from({ length: adminGradeCounts[editTargetGrade as 1 | 2 | 3] || 8 }, (_, i) => i + 1).map(c => <option key={c} value={c}>{c}반</option>)}
                </select>
                <span className="text-xs text-slate-400">현재 학급 학생수: <strong className="text-amber-400">{editTargetStudents.length}명</strong></span>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`${editTargetGrade}학년 ${editTargetClass}반의 학생 명단 전체를 삭제하시겠습니까?`)) {
                    const key = `${editTargetGrade}-${editTargetClass}`;
                    setTempClassRosters(prev => ({ ...prev, [key]: [] }));
                  }
                }}
                className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Trash2 size={14} /> 현재 학급 명단 전체 삭제
              </button>
            </div>

            <div className="flex gap-2">
              <select 
                value={newStudentNum}
                onChange={(e) => setNewStudentNum(e.target.value)}
                className="bg-[#111a15] text-white text-xs px-4 py-2.5 rounded-xl border border-emerald-900 outline-none"
              >
                {Array.from({ length: 40 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}번</option>)}
              </select>

              <input 
                type="text" 
                value={newStudentNameOnly}
                onChange={(e) => setNewStudentNameOnly(e.target.value)}
                placeholder="학생 성명 입력 (예: 홍길동)"
                className="flex-1 px-4 py-2.5 bg-[#111a15] text-white rounded-xl border border-emerald-900 text-sm outline-none focus:border-emerald-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newStudentNameOnly.trim()) {
                    const key = `${editTargetGrade}-${editTargetClass}`;
                    const currentList = tempClassRosters[key] || [];
                    const newEntry = `${newStudentNum}번 ${newStudentNameOnly.trim()}`;
                    setTempClassRosters({ ...tempClassRosters, [key]: [...currentList, newEntry] });
                    setNewStudentNameOnly('');
                  }
                }}
              />

              <button 
                type="button"
                onClick={() => {
                  if (newStudentNameOnly.trim()) {
                    const key = `${editTargetGrade}-${editTargetClass}`;
                    const currentList = tempClassRosters[key] || [];
                    const newEntry = `${newStudentNum}번 ${newStudentNameOnly.trim()}`;
                    setTempClassRosters({ ...tempClassRosters, [key]: [...currentList, newEntry] });
                    setNewStudentNameOnly('');
                  }
                }}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Plus size={16} /> 학생 추가
              </button>
            </div>

            <div className="w-full bg-[#111a15] p-3 rounded-xl border border-emerald-900 grid grid-cols-2 md:grid-cols-4 gap-2">
              {editTargetStudents.length > 0 ? (
                editTargetStudents.map((stu, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-[#1c2e25] px-3 py-1.5 rounded-lg border border-emerald-800 text-xs">
                    <span>{stu}</span>
                    <button 
                      type="button" 
                      onClick={() => {
                        const key = `${editTargetGrade}-${editTargetClass}`;
                        const updated = editTargetStudents.filter((_, i) => i !== idx);
                        setTempClassRosters({ ...tempClassRosters, [key]: updated });
                      }}
                      className="text-rose-400 hover:text-rose-200 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="col-span-4 text-center py-6 text-xs text-slate-500">
                  등록된 학생이 없습니다. CSV를 업로드하거나 번호/성명을 입력해 추가해 주세요.
                </div>
              )}
            </div>
          </section>

          <section className="bg-[#1c2e25] border border-indigo-500/40 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-base font-bold text-indigo-300 flex items-center gap-2">📚 {editTargetGrade}학년 {editTargetClass}반 <b>{['일', '월', '화', '수', '목', '금', '토'][new Date(adminDate).getDay()]}요일</b> 고정 시간표 설정 <span className="text-xs text-slate-500 font-normal ml-2">(1학기 전체 반영)</span></h2>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => handleNeisFetch('timetable')}
                  disabled={isNeisLoading}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
                >
                  <Database size={14} /> 해당 요일 나이스 연동
                </button>
                <div className="relative">
                  <input 
                    type="file" 
                    accept="image/*, .pdf" 
                    onChange={handleTimetableImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    title="한 주 치 전체 자동 인식"
                  />
                  <div className="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-colors">
                    {isNeisLoading ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />} AI 1주일치 전체 인식
                  </div>
                </div>
              </div>
            </div>

            {timetableFileName && <p className="text-xs text-emerald-400">인식된 파일: {timetableFileName}</p>}

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
                          onChange={(e) => setTempDailySchedule({ ...tempDailySchedule, [p]: { ...sch, startH: e.target.value } })}
                          className="bg-[#1c2e25] text-white text-xs px-2 py-1.5 rounded-lg border border-emerald-700"
                        >
                          {hoursList.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <span>:</span>
                        <select 
                          value={sch.startM}
                          onChange={(e) => setTempDailySchedule({ ...tempDailySchedule, [p]: { ...sch, startM: e.target.value } })}
                          className="bg-[#1c2e25] text-white text-xs px-2 py-1.5 rounded-lg border border-emerald-700"
                        >
                          {minutesList.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>

                      <span className="text-slate-400">~</span>

                      <div className="flex items-center gap-1">
                        <select 
                          value={sch.endH}
                          onChange={(e) => setTempDailySchedule({ ...tempDailySchedule, [p]: { ...sch, endH: e.target.value } })}
                          className="bg-[#1c2e25] text-white text-xs px-2 py-1.5 rounded-lg border border-emerald-700"
                        >
                          {hoursList.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <span>:</span>
                        <select 
                          value={sch.endM}
                          onChange={(e) => setTempDailySchedule({ ...tempDailySchedule, [p]: { ...sch, endM: e.target.value } })}
                          className="bg-[#1c2e25] text-white text-xs px-2 py-1.5 rounded-lg border border-emerald-700"
                        >
                          {minutesList.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-emerald-900/60">
              <label className="text-xs text-amber-300 font-bold block">{editTargetGrade}학년 {editTargetClass}반 과목명 설정</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6, 7].map((p) => (
                  <div key={p} className="space-y-1">
                    <label className="text-xs text-slate-300 font-bold">{p}교시 과목</label>
                    <input 
                      type="text" 
                      value={currentAdminTimetable[p] || ''}
                      onChange={(e) => {
                        const key = `${editTargetGrade}-${editTargetClass}`;
                        const classData = tempClassTimetables[key] || {};
                        const dayData = classData[adminDayOfWeek] || {};
                        setTempClassTimetables({
                          ...tempClassTimetables,
                          [key]: {
                            ...classData,
                            [adminDayOfWeek]: { ...dayData, [p]: e.target.value }
                          }
                        });
                      }}
                      className="w-full px-3 py-2 bg-[#111a15] text-white rounded-xl border border-emerald-900 text-sm focus:border-emerald-500 outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-[#1c2e25] border border-indigo-500/40 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-base font-bold text-indigo-300 flex items-center gap-2">🍲 급식 식단 설정 <span className="text-xs text-indigo-400 bg-indigo-950 px-2 py-1 rounded-lg ml-2">({adminDate})</span></h2>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => handleNeisFetch('meal')}
                  disabled={isNeisLoading}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
                >
                  <Database size={14} /> 나이스(NEIS) 선택일 연동
                </button>
                <div className="relative">
                  <input 
                    type="file" 
                    accept="image/*, .pdf" 
                    onChange={handleMealFileupload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    title="한 달 치 전체 자동 인식"
                  />
                  <div className="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-colors">
                    {isNeisLoading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} AI 1달치 전체 인식
                  </div>
                </div>
              </div>
            </div>

            {mealFileName && <p className="text-xs text-emerald-400">인식된 파일: {mealFileName}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs text-amber-300 font-bold">점심 메뉴 (줄바꿈으로 구분)</label>
                <textarea 
                  value={(currentAdminMeals.lunch || []).join('\n')}
                  onChange={(e) => setTempMeals({ ...tempMeals, [adminDateKey]: { ...currentAdminMeals, lunch: e.target.value.split('\n') } })}
                  className="w-full h-32 p-3 bg-[#111a15] text-white rounded-xl border border-emerald-900 text-sm resize-none focus:border-amber-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-indigo-300 font-bold">저녁 메뉴 (줄바꿈으로 구분)</label>
                <textarea 
                  value={(currentAdminMeals.dinner || []).join('\n')}
                  onChange={(e) => setTempMeals({ ...tempMeals, [adminDateKey]: { ...currentAdminMeals, dinner: e.target.value.split('\n') } })}
                  className="w-full h-32 p-3 bg-[#111a15] text-white rounded-xl border border-emerald-900 text-sm resize-none focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
          </section>

          {/* 💡 [핵심 수정] 긴급 복구용 버튼 추가 */}
          <div className="flex justify-end gap-3 pt-4">
            <button 
              onClick={() => {
                if(window.confirm('저장 오류(용량 초과)가 발생했나요?\n이 버튼을 누르면 내부의 찌꺼기 시간표/급식 데이터가 완전히 비워져 오류가 해결됩니다.\n(학생 명단은 유지됩니다.)')) {
                  localStorage.removeItem('class_timetables_map');
                  localStorage.removeItem('meal_data');
                  setTempClassTimetables({});
                  setTempMeals({});
                  alert('✅ 쓰레기 데이터가 비워졌습니다. 이제 다시 데이터를 불러오거나 저장해주세요!');
                }
              }} 
              className="px-6 py-3.5 bg-rose-900/60 hover:bg-rose-800 text-rose-300 rounded-2xl text-xs font-bold cursor-pointer transition-colors border border-rose-800"
            >
              🧹 용량 초과 오류 해결 (초기화)
            </button>
            <button onClick={handleSaveAdminSettings} className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-sm font-bold cursor-pointer shadow-lg">
              설정 저장 및 달력 동기화
            </button>
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
      <div className="h-screen w-full bg-[#111a15] text-emerald-400 flex flex-col items-center justify-center space-y-4 select-none">
        <div className="text-5xl mb-2">💤</div>
        <h2 className="text-2xl font-black text-white tracking-tight">알림판 화면이 숨겨졌습니다.</h2>
        <p className="text-xs text-emerald-500/80">바탕화면에서 작업 중입니다. 새로운 알림이 오면 자동으로 깨어납니다.</p>
        <button 
          onClick={() => setIsExited(false)} 
          className="mt-6 px-6 py-3 bg-[#243e33] hover:bg-[#2c4a3e] text-white rounded-xl text-xs font-bold border border-emerald-700/60 shadow-lg cursor-pointer transition-all"
        >
          알림판 강제로 깨우기
        </button>
      </div>
    );
  }

  const parsedCall = (() => {
    if (!announcement || !announcement.includes('[대상:')) return null;
    const lines = announcement.split('\n');
    if (lines.length >= 4) {
      const target = lines[0].replace(/\[대상:\s*/, '').replace(']', '');
      const message = lines[1].replace('호출 내용: ', '');
      const location = lines[2].replace('장소: ', '');
      const teacher = lines[3].replace(/^\(/, '').replace(/ 선생님 호출\)$/, '');
      return { target, message, location, teacher };
    }
    return null;
  })();

  return (
    <div className="h-screen w-full bg-[#1e382b] text-white font-sans flex flex-col select-none overflow-hidden relative shadow-2xl border-4 border-[#2b4c3b]">
      
      <header className="h-20 px-8 flex items-center justify-between border-b border-emerald-900/60 bg-[#162d22]/60 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={handleGoHome} className="px-3 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 text-xs font-bold border border-emerald-800 cursor-pointer" title="홈 화면으로 이동 및 고정 설정 해제">
            🏠 홈 (고정 해제)
          </button>
          <div className="flex flex-col">
            <span className="text-xs text-emerald-400 font-medium tracking-wider">{schoolConfig.schoolName}</span>
            <h1 className="text-2xl font-black tracking-tight text-white drop-shadow-md">{schoolConfig.currentGrade}학년 {schoolConfig.currentClass}반 알림판</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-3xl font-black tracking-widest text-emerald-100 font-mono">{timeString}</div>
            <div className="text-xs text-emerald-400 font-semibold">{dateString}</div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsPopupOpen(true)}
              className="px-3 py-2.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-200 text-xs font-bold border border-amber-700/60 shadow-inner cursor-pointer flex items-center gap-1"
              title="현재 전달사항 다시 보기"
            >
              <Bell size={16} /> 전달사항 보기
            </button>
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

      <main className="flex-1 p-8 grid grid-cols-12 gap-8 overflow-hidden">
        
        <section className="col-span-7 flex flex-col bg-[#162d22]/40 rounded-3xl p-6 border border-emerald-900/40 shadow-sm h-full">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <BookOpen size={20} className="text-emerald-400" />
              <h2 className="text-base font-bold text-emerald-200">오늘의 시간표</h2>
            </div>
            <span className="text-xs text-emerald-400/80 font-mono">1교시 {formatScheduleString(dailySchedule[1])}</span>
          </div>
          
          <div className="grid grid-cols-4 gap-4 flex-1 min-h-0 pb-2">
            {[
              { period: '1교시', time: formatScheduleString(dailySchedule[1]), subject: todayTimetableObj[1] },
              { period: '2교시', time: formatScheduleString(dailySchedule[2]), subject: todayTimetableObj[2] },
              { period: '3교시', time: formatScheduleString(dailySchedule[3]), subject: todayTimetableObj[3] },
              { period: '4교시', time: formatScheduleString(dailySchedule[4]), subject: todayTimetableObj[4] },
              { period: '5교시', time: formatScheduleString(dailySchedule[5]), subject: todayTimetableObj[5] },
              { period: '6교시', time: formatScheduleString(dailySchedule[6]), subject: todayTimetableObj[6] },
              { period: '7교시', time: formatScheduleString(dailySchedule[7]), subject: todayTimetableObj[7] }
            ].map((item, idx) => {
              const colors = [
                'bg-[#fff9c4] text-slate-900 rotate-[-0.8deg]',
                'bg-[#fce4ec] text-slate-900 rotate-[0.8deg]',
                'bg-[#e3f2fd] text-slate-900 rotate-[-0.5deg]',
                'bg-[#e8f5e9] text-slate-900 rotate-[0.6deg]',
                'bg-[#fff3e0] text-slate-900 rotate-[-1.0deg]',
                'bg-[#f3e5f5] text-slate-900 rotate-[1.2deg]',
                'bg-[#e0f2f1] text-slate-900 rotate-[-0.7deg]'
              ];
              return (
                <div key={idx} className={`${colors[idx % colors.length]} rounded-2xl p-4 flex flex-col justify-between shadow-xl font-handwriting transition-transform hover:scale-105 duration-200 relative border border-black/5 h-full`}>
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-12 h-4 bg-amber-200/60 rotate-1 shadow-sm border border-amber-300/40"></div>
                  
                  <div className="flex justify-between items-center font-sans px-1">
                    <span className="text-sm font-bold opacity-70 mt-1">{item.period}</span>
                    <span className="text-xs opacity-60 mt-1 tracking-wider">{item.time}</span>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center my-auto px-2">
                    <span className="text-6xl mb-4 opacity-90 drop-shadow-md">{getSubjectIcon(item.subject)}</span>
                    <span className="text-2xl 2xl:text-3xl font-black text-center break-keep leading-snug tracking-tight text-slate-800">{item.subject}</span>
                  </div>
                  
                  <div className="w-2.5 h-2.5 bg-rose-500/80 rounded-full mx-auto shadow-sm mt-1"></div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="col-span-5 flex flex-col bg-[#162d22]/40 rounded-3xl p-6 border border-emerald-900/40 shadow-sm h-full">
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <Utensils size={20} className="text-emerald-400" />
            <h2 className="text-base font-bold text-emerald-200">오늘의 급식</h2>
          </div>

          <div className="grid grid-cols-2 gap-5 flex-1 min-h-0 pb-2">
            
            <div className="bg-[#11231b]/90 rounded-3xl p-8 border border-emerald-800/50 flex flex-col items-center justify-between text-center shadow-inner h-full">
              <span className="text-base font-bold text-amber-300 bg-amber-950/80 px-6 py-2 rounded-full shadow-sm border border-amber-800/40 mb-6 shrink-0">🍴 점심 식단</span>
              <ul className="text-2xl lg:text-3xl font-black text-emerald-100 space-y-5 leading-normal flex-1 flex flex-col justify-center w-full">
                {todayMealsObj.lunch.map((m: string, i: number) => <li key={i} className="break-keep drop-shadow-md">{m}</li>)}
              </ul>
              <div className="text-sm text-emerald-400/60 font-mono tracking-[0.3em] mt-6 shrink-0">LUNCH MENU</div>
            </div>

            <div className="bg-[#11231b]/90 rounded-3xl p-8 border border-emerald-800/50 flex flex-col items-center justify-between text-center shadow-inner h-full">
              <span className="text-base font-bold text-indigo-300 bg-indigo-950/80 px-6 py-2 rounded-full shadow-sm border border-indigo-800/40 mb-6 shrink-0">🌙 저녁 식단</span>
              <ul className="text-2xl lg:text-3xl font-black text-emerald-100 space-y-5 leading-normal flex-1 flex flex-col justify-center w-full">
                {todayMealsObj.dinner.map((m: string, i: number) => <li key={i} className="break-keep drop-shadow-md">{m}</li>)}
              </ul>
              <div className="text-sm text-emerald-400/60 font-mono tracking-[0.3em] mt-6 shrink-0">DINNER MENU</div>
            </div>
            
          </div>
        </section>

      </main>

      {isPopupOpen && (
        <div 
          onClick={handleClosePopupAndHide} 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-fade-in cursor-pointer"
          title="클릭하거나 터치하면 팝업이 닫힙니다."
        >
          <div className="relative w-full max-w-4xl bg-[#050505] border-4 border-[#ff0055] rounded-3xl p-12 shadow-[0_0_80px_#ff0055,inset_0_0_40px_#ff0055] flex flex-col items-center text-center overflow-hidden" onClick={(e) => e.stopPropagation()}>
            
            <div className="absolute -top-20 -left-20 w-80 h-80 bg-[#00ffcc] opacity-20 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#ff0055] opacity-20 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="relative z-10 w-full">
              <div className="flex items-center justify-center gap-4 mb-8">
                <span className="text-5xl animate-pulse">🚨</span>
                <h2 className="text-5xl font-black text-white tracking-widest [text-shadow:0_0_10px_#fff,0_0_20px_#ff0055,0_0_40px_#ff0055,0_0_80px_#ff0055] animate-pulse">
                  새로운 전달사항
                </h2>
              </div>

              {parsedCall ? (
                <div className="w-full space-y-6 mb-10">
                  <div className="w-full bg-[#0a0a0a]/90 backdrop-blur-md rounded-3xl p-8 border border-[#00ffcc]/60 shadow-[0_0_40px_rgba(0,255,204,0.3)] flex flex-col items-center">
                    <span className="px-6 py-2.5 bg-[#00ffcc]/20 text-[#00ffcc] rounded-full text-xl font-black tracking-widest border border-[#00ffcc]/40 mb-6 shadow-inner">
                      대상: {parsedCall.target}
                    </span>
                    <p className="text-4xl md:text-5xl font-black text-white leading-tight [word-break:keep-all] [text-shadow:0_0_20px_rgba(255,255,255,0.5)]">
                      {parsedCall.message}
                    </p>
                  </div>

                  <div className="w-full bg-[#1a0510]/90 backdrop-blur-md rounded-3xl p-6 border border-[#ff0055]/60 shadow-[0_0_40px_rgba(255,0,85,0.3)] flex flex-wrap justify-center items-center gap-8">
                    <div className="flex items-center gap-3 text-3xl font-bold text-[#ff0055] [text-shadow:0_0_15px_rgba(255,0,85,0.6)]">
                      <MapPin size={36} /> {parsedCall.location}
                    </div>
                    <div className="hidden md:block w-2 h-10 bg-white/10 rounded-full"></div>
                    <div className="flex items-center gap-3 text-3xl font-bold text-[#ff0055] [text-shadow:0_0_15px_rgba(255,0,85,0.6)]">
                      <User size={36} /> {parsedCall.teacher} 선생님
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full bg-[#0a0a0a]/80 backdrop-blur-md rounded-3xl p-10 border border-[#00ffcc]/50 shadow-[0_0_30px_rgba(0,255,204,0.2)] mb-10">
                  <p className="text-4xl font-black text-[#00ffcc] leading-relaxed [word-break:keep-all] whitespace-pre-wrap [text-shadow:0_0_10px_#00ffcc,0_0_20px_#00ffcc]">
                    {announcement}
                  </p>
                </div>
              )}

              <div className="flex flex-col items-center gap-4 w-full">
                <button 
                  onClick={handleClosePopupAndHide}
                  className="px-12 py-5 bg-[#ff0055] hover:bg-[#ff3377] text-white font-black rounded-2xl shadow-[0_0_20px_#ff0055] transition-all text-xl flex items-center gap-3 cursor-pointer active:scale-95"
                >
                  <X size={28} strokeWidth={3} />
                  확인 (닫기)
                </button>
                <span className="text-sm text-slate-400 font-bold tracking-widest mt-2">※ 1분이 지나면 팝업이 자동으로 닫히고 대시보드가 표시됩니다.</span>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}