const fs = require('fs');
let storeContent = fs.readFileSync('src/lib/store.ts', 'utf8');

// Replace the local roster logic with Firebase based hook
const newRosterHook = `
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
    const rosterRef = ref(db, \`school_data/students/\${grade}/\${classNm}\`);
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
`;

storeContent = storeContent.replace(/export function useLocalRoster[\s\S]*?^}/m, newRosterHook);
fs.writeFileSync('src/lib/store.ts', storeContent);
