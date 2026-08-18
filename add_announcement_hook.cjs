const fs = require('fs');
let storeContent = fs.readFileSync('src/lib/store.ts', 'utf8');

const newHook = `
export function useClassAnnouncement(grade: string, classNm: string) {
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
}
`;

storeContent = storeContent + newHook;
fs.writeFileSync('src/lib/store.ts', storeContent);
