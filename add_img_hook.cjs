const fs = require('fs');
let storeContent = fs.readFileSync('src/lib/store.ts', 'utf8');

const newHook = `
export function useClassTimetableImage(grade: string, classNm: string) {
  const [timetableImage, setTimetableImage] = useState<string | null>(null);

  useEffect(() => {
    if (!grade || !classNm || !db) {
      setTimetableImage(null);
      return;
    }

    const imgRef = ref(db, \`school_data/timetable_images/\${grade}/\${classNm}\`);
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
      await set(ref(db, \`school_data/timetable_images/\${grade}/\${classNm}\`), base64Str);
    } else {
      await set(ref(db, \`school_data/timetable_images/\${grade}/\${classNm}\`), null);
    }
  };

  return { timetableImage, updateTimetableImage };
}
`;

if(!storeContent.includes('useClassTimetableImage')) {
  storeContent = storeContent + newHook;
  fs.writeFileSync('src/lib/store.ts', storeContent);
}
