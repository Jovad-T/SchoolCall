import { useState, useEffect } from 'react';
import { db } from './firebase';
import { ref, onValue, set } from 'firebase/database';

export type CallState = {
  callStatus: boolean;
  studentName: string;
  message: string;
  teacherName: string;
  location: string;
};

const defaultState: CallState = {
  callStatus: false,
  studentName: '',
  message: '',
  teacherName: '',
  location: '',
};

export function useCallState(classId: string) {
  const [state, setState] = useState<CallState>(defaultState);
  const [isFirebaseConnected] = useState<boolean>(!!db);

  useEffect(() => {
    if (!classId) return;

    if (db) {
      // Firebase Realtime Database 연동 (반별 분리)
      const callRef = ref(db, `calls/${classId}`);
      const unsub = onValue(callRef, (snapshot) => {
        if (snapshot.exists()) {
          setState(snapshot.val() as CallState);
        } else {
          setState(defaultState);
        }
      });
      return () => unsub();
    } else {
      // Firebase가 없을 경우 Local BroadcastChannel 통신 (반별 분리)
      const channel = new BroadcastChannel(`call_app_sync_${classId}`);
      const handleMessage = (e: MessageEvent) => {
        setState(e.data);
      };
      channel.addEventListener('message', handleMessage);
      
      const saved = localStorage.getItem(`callState_${classId}`);
      if (saved) setState(JSON.parse(saved));
      else setState(defaultState);
      
      return () => {
        channel.removeEventListener('message', handleMessage);
        channel.close();
      };
    }
  }, [classId]);

  const updateState = async (newState: CallState) => {
    if (!classId) return;
    if (db) {
      await set(ref(db, `calls/${classId}`), newState);
    } else {
      setState(newState);
      const channel = new BroadcastChannel(`call_app_sync_${classId}`);
      channel.postMessage(newState);
      localStorage.setItem(`callState_${classId}`, JSON.stringify(newState));
      channel.close();
    }
  };

  return { state, updateState, isFirebaseConnected };
}


export type Student = {
  id: string;
  name: string;
};

// 전역 상태 (단순화를 위해 모듈 스코프 변수와 이벤트 리스너 활용)
let globalStudents: Student[] = [];
try {
  const saved = localStorage.getItem('school_students_csv');
  if (saved) {
    globalStudents = JSON.parse(saved);
  }
} catch (e) {}

const listeners = new Set<() => void>();

export function setGlobalStudents(students: Student[]) {
  globalStudents = students;
  localStorage.setItem('school_students_csv', JSON.stringify(students));
  listeners.forEach(l => l());
}


export function useLocalRoster(grade: string, classNm: string) {
  const [roster, setRoster] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!grade || !classNm || !db) {
      setRoster([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const rosterRef = ref(db, `school_data/students/${grade}/${classNm}`);
    const unsub = onValue(rosterRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (Array.isArray(data)) {
          setRoster(data);
        } else {
          // If stored as object, convert to array and sort
          const arr = Object.values(data) as string[];
          setRoster(arr.sort((a, b) => parseInt(a) - parseInt(b)));
        }
      } else {
        setRoster([]);
      }
      setIsLoading(false);
    });

    return () => unsub();
  }, [grade, classNm]);

  return { roster, isLoading };
}


export function useSchoolStructure() {
  const [structure, setStructure] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setStructure({});
      setIsLoading(false);
      return;
    }

    const studentsRef = ref(db, 'school_data/students');
    const unsub = onValue(studentsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const newStructure: Record<string, string[]> = {};
        
        // Extract grades and their classes
        Object.keys(data).forEach(grade => {
          newStructure[grade] = Object.keys(data[grade] || {}).sort((a, b) => parseInt(a) - parseInt(b));
        });
        
        setStructure(newStructure);
      } else {
        setStructure({});
      }
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  return { structure, isLoading };
}

export function useClassAnnouncement(grade: string, classNm: string) {
  const [announcement, setAnnouncement] = useState<string>('');

  useEffect(() => {
    if (!grade || !classNm || !db) {
      setAnnouncement('');
      return;
    }

    const annRef = ref(db, `school_data/announcements/${grade}/${classNm}`);
    const unsub = onValue(annRef, (snapshot) => {
      if (snapshot.exists()) {
        setAnnouncement(snapshot.val());
      } else {
        setAnnouncement('');
      }
    });

    return () => unsub();
  }, [grade, classNm]);

  const updateAnnouncement = async (newAnnouncement: string) => {
    if (!grade || !classNm || !db) return;
    await set(ref(db, `school_data/announcements/${grade}/${classNm}`), newAnnouncement);
  };

  return { announcement, updateAnnouncement };
}

export function useClassTimetable(grade: string, classNm: string) {
  const [customTimetable, setCustomTimetable] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!grade || !classNm || !db) {
      setCustomTimetable({});
      return;
    }

    const ttRef = ref(db, `school_data/timetables/${grade}/${classNm}`);
    const unsub = onValue(ttRef, (snapshot) => {
      if (snapshot.exists()) {
        setCustomTimetable(snapshot.val());
      } else {
        setCustomTimetable({});
      }
    });

    return () => unsub();
  }, [grade, classNm]);

  const updateCustomTimetable = async (newTimetable: Record<string, string[]>) => {
    if (!grade || !classNm || !db) return;
    await set(ref(db, `school_data/timetables/${grade}/${classNm}`), newTimetable);
  };

  return { customTimetable, updateCustomTimetable };
}

export function useClassTimetableImage(grade: string, classNm: string) {
  const [timetableImage, setTimetableImage] = useState<string | null>(null);

  useEffect(() => {
    if (!grade || !classNm || !db) {
      setTimetableImage(null);
      return;
    }

    const imgRef = ref(db, `school_data/timetable_images/${grade}/${classNm}`);
    const unsub = onValue(imgRef, (snapshot) => {
      if (snapshot.exists()) {
        setTimetableImage(snapshot.val());
      } else {
        setTimetableImage(null);
      }
    });

    return () => unsub();
  }, [grade, classNm]);

  const updateTimetableImage = async (base64Str: string | null) => {
    if (!grade || !classNm || !db) return;
    if (base64Str) {
      await set(ref(db, `school_data/timetable_images/${grade}/${classNm}`), base64Str);
    } else {
      await set(ref(db, `school_data/timetable_images/${grade}/${classNm}`), null);
    }
  };

  return { timetableImage, updateTimetableImage };
}

export type CustomMeal = {
  date: string;
  lunch: string[];
  dinner: string[];
};

export function useCustomMeal() {
  const [customMeal, setCustomMeal] = useState<CustomMeal | null>(null);

  useEffect(() => {
    if (!db) return;
    const mealRef = ref(db, `school_data/custom_meal`);
    const unsub = onValue(mealRef, (snapshot) => {
      if (snapshot.exists()) {
        setCustomMeal(snapshot.val() as CustomMeal);
      } else {
        setCustomMeal(null);
      }
    });
    return () => unsub();
  }, []);

  const updateCustomMeal = async (meal: CustomMeal | null) => {
    if (!db) return;
    await set(ref(db, `school_data/custom_meal`), meal);
  };

  return { customMeal, updateCustomMeal };
}
