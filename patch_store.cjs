const fs = require('fs');
let code = fs.readFileSync('src/lib/store.ts', 'utf8');

const oldUseClassAnnouncement = `export function useClassAnnouncement(grade: string, classNm: string) {
  const [announcement, setAnnouncement] = useState<string>('');

  useEffect(() => {
    if (!grade || !classNm || !db) {
      setAnnouncement('');
      return;
    }
    const annRef = ref(db, \`school_data/announcements/\${grade}/\${classNm}\`);
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
    await set(ref(db, \`school_data/announcements/\${grade}/\${classNm}\`), newAnnouncement);
  };

  return { announcement, updateAnnouncement };
}`;

const newUseClassAnnouncement = `export function useClassAnnouncement(grade: string, classNm: string) {
  const [announcement, setAnnouncement] = useState<string>('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(0);

  useEffect(() => {
    if (!grade || !classNm || !db) {
      setAnnouncement('');
      return;
    }
    const annRef = ref(db, \`classes/\${grade}-\${classNm}/announcement\`);
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
    await set(ref(db, \`classes/\${grade}-\${classNm}/announcement\`), {
      text: newAnnouncement,
      updatedAt: Date.now()
    });
  };

  return { announcement, updateAnnouncement, lastUpdatedAt };
}`;

// It might differ slightly in whitespace, so let's do regex replacement for the whole function.
const useClassAnnouncementRegex = /export function useClassAnnouncement\(grade: string, classNm: string\) \{[\s\S]*?return \{ announcement, updateAnnouncement(?:, lastUpdatedAt)? \};\n\}/;
code = code.replace(useClassAnnouncementRegex, newUseClassAnnouncement);

const useCallStateRegex = /export function useCallState\(classId: string\) \{[\s\S]*?return \{ state, updateState, isFirebaseConnected \};\n\}/;
const newUseCallState = `export function useCallState(classId: string) {
  const [state, setState] = useState<CallState>(defaultState);
  const [isFirebaseConnected] = useState<boolean>(!!db);

  useEffect(() => {
    if (!classId) return;
    if (db) {
      const callRef = ref(db, \`classes/\${classId}/callState\`);
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
      await set(ref(db, \`classes/\${classId}/callState\`), newState || defaultState);
    }
  };

  return { state, updateState, isFirebaseConnected };
}`;

code = code.replace(useCallStateRegex, newUseCallState);

fs.writeFileSync('src/lib/store.ts', code);
