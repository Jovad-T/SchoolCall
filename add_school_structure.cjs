const fs = require('fs');
let storeContent = fs.readFileSync('src/lib/store.ts', 'utf8');

const newHook = `
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
`;

storeContent = storeContent + newHook;
fs.writeFileSync('src/lib/store.ts', storeContent);
