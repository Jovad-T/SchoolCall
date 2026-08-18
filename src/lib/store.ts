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
