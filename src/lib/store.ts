import { useState, useEffect } from 'react';
import { db } from './firebase';
import { ref, onValue, set, update } from 'firebase/database';

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
      const callRef = ref(db, `classes/${classId}/callState`);
      const unsub = onValue(callRef, (snapshot) => {
        if (snapshot.exists()) {
          setState(snapshot.val() as CallState);
        } else {
          setState(defaultState);
        }
      });
      return () => unsub();
    } else {
      // Fallback
      setState(defaultState);
    }
  }, [classId]);

  const updateState = async (newState: CallState | null) => {
    if (!classId) return;
    if (db) {
      await set(ref(db, `classes/${classId}/callState`), newState || defaultState);
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
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(0);

  useEffect(() => {
    if (!grade || !classNm || !db) {
      setAnnouncement('');
      return;
    }
    const annRef = ref(db, `classes/${grade}-${classNm}/announcement`);
    const unsub = onValue(annRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (typeof data === 'string') {
          setAnnouncement(data);
        } else if (data && typeof data === 'object') {
          setAnnouncement(data.text || '');
          setLastUpdatedAt(data.updatedAt || 0);
        }
      } else {
        setAnnouncement('');
      }
    });

    return () => unsub();
  }, [grade, classNm]);

  const updateAnnouncement = async (newAnnouncement: string) => {
    if (!grade || !classNm || !db) return;
    await set(ref(db, `classes/${grade}-${classNm}/announcement`), {
      text: newAnnouncement,
      updatedAt: Date.now()
    });
  };

  return { announcement, updateAnnouncement, lastUpdatedAt };
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

export function useCustomMeal(date: string) {
  const [customMeal, setCustomMeal] = useState<CustomMeal | null>(null);

  useEffect(() => {
    if (!db || !date) return;
    const mealRef = ref(db, `school_data/meals/${date}`);
    const unsub = onValue(mealRef, (snapshot) => {
      if (snapshot.exists()) {
        setCustomMeal(snapshot.val() as CustomMeal);
      } else {
        setCustomMeal(null);
      }
    });
    return () => unsub();
  }, [date]);

  const updateCustomMeal = async (meal: CustomMeal | null) => {
    if (!db || !date) return;
    await set(ref(db, `school_data/meals/${date}`), meal);
  };

  return { customMeal, updateCustomMeal };
}

export function useAllCustomMeals() {
  const [allMeals, setAllMeals] = useState<Record<string, CustomMeal>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }
    const mealsRef = ref(db, 'school_data/meals');
    const unsub = onValue(mealsRef, (snapshot) => {
      if (snapshot.exists()) {
        setAllMeals(snapshot.val() as Record<string, CustomMeal>);
      } else {
        setAllMeals({});
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const saveMultipleCustomMeals = async (meals: CustomMeal[]) => {
    if (!db || meals.length === 0) return;
    const updates: Record<string, any> = {};
    meals.forEach((m) => {
      if (m && m.date) {
        updates[`school_data/meals/${m.date}`] = {
          date: m.date,
          lunch: m.lunch || [],
          dinner: m.dinner || []
        };
      }
    });
    await update(ref(db), updates);
  };

  const deleteCustomMeal = async (date: string) => {
    if (!db || !date) return;
    await set(ref(db, `school_data/meals/${date}`), null);
  };

  const clearAllCustomMeals = async () => {
    if (!db) return;
    await set(ref(db, 'school_data/meals'), null);
  };

  return { allMeals, isLoading, saveMultipleCustomMeals, deleteCustomMeal, clearAllCustomMeals };
}

export type RoomSchedule = {
  dayOfWeek: number;
  period: number;
  subject: string;
  time: string;
};

export type Room = {
  id: string;
  teacherName: string;
  schedule: RoomSchedule[];
};

export function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  
  useEffect(() => {
    if (!db) return;
    const roomsRef = ref(db, 'school_data/rooms');
    const unsub = onValue(roomsRef, (snapshot) => {
      if (snapshot.exists()) {
        setRooms(snapshot.val());
      } else {
        setRooms([]);
      }
    });
    return () => unsub();
  }, []);

  const updateRooms = async (newRooms: Room[]) => {
    if (!db) return;
    await set(ref(db, 'school_data/rooms'), newRooms);
  };

  return { rooms, updateRooms };
}
