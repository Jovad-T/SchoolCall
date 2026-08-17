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
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
        const update = () => {
      const filtered = globalStudents.filter(s => {
        if (s.id.length >= 4) {
          const g = s.id[0];
          let c = s.id.substring(1, s.id.length - 2);
          if (c.startsWith('0')) c = c.substring(1);
          return g === grade && c === classNm;
        }
        return false;
      }).map(s => `${parseInt(s.id.slice(-2))}번 ${s.name}`);
      
      setRoster(filtered);
    };

    update();
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, [grade, classNm]);

  return { roster, isLoading };
}
