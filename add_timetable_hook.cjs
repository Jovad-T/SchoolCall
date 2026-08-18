const fs = require('fs');
let storeContent = fs.readFileSync('src/lib/store.ts', 'utf8');

const newHook = `
export function useClassTimetable(grade: string, classNm: string) {
  const [customTimetable, setCustomTimetable] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!grade || !classNm || !db) {
      setCustomTimetable({});
      return;
    }

    const ttRef = ref(db, \`school_data/timetables/\${grade}/\${classNm}\`);
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
    await set(ref(db, \`school_data/timetables/\${grade}/\${classNm}\`), newTimetable);
  };

  return { customTimetable, updateCustomTimetable };
}
`;

storeContent = storeContent + newHook;
fs.writeFileSync('src/lib/store.ts', storeContent);
