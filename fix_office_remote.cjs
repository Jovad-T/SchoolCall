const fs = require('fs');
let content = fs.readFileSync('src/components/OfficeRemote.tsx', 'utf8');

// Import useSchoolStructure
content = content.replace(
  "import { useCallState, useLocalRoster } from '../lib/store';",
  "import { useCallState, useLocalRoster, useSchoolStructure } from '../lib/store';"
);

// Add hook call inside component
const hookCall = `
  const { roster, isLoading } = useLocalRoster(grade, classNm);
  const { structure, isLoading: isStructureLoading } = useSchoolStructure();
`;
content = content.replace(
  "const { roster, isLoading } = useLocalRoster(grade, classNm);",
  hookCall.trim()
);

// We need to adjust effect to default to first available grade and class if they exist
const effectLogic = `
  // Update available grades and classes
  const availableGrades = Object.keys(structure).sort((a, b) => parseInt(a) - parseInt(b));
  const availableClasses = structure[grade] || [];

  // If currently selected grade/class doesn't exist in structure, reset it
  useEffect(() => {
    if (!isStructureLoading && availableGrades.length > 0) {
      if (!availableGrades.includes(grade)) {
        setGrade(availableGrades[0]);
      } else if (availableClasses.length > 0 && !availableClasses.includes(classNm)) {
        setClassNm(availableClasses[0]);
      }
    }
  }, [structure, grade, classNm, isStructureLoading, availableGrades, availableClasses]);
`;

// Find where to insert effectLogic (after state declarations)
content = content.replace(
  "const [location, setLocation] = useState('');",
  "const [location, setLocation] = useState('');\n" + effectLogic
);

// Replace the UI for Grade and Class Selectors
const selectRegex = /<section className="grid grid-cols-2 gap-4 bg-\[#111\] p-4 rounded-xl border border-\[#333\]">[\s\S]*?<\/section>/;

const newSelect = `
          <section className="grid grid-cols-2 gap-4 bg-[#111] p-4 rounded-xl border border-[#333]">
            <div>
              <label className="text-[10px] uppercase text-[#777] font-bold mb-2 block tracking-wider">Grade (학년)</label>
              <select 
                value={grade}
                onChange={e => setGrade(e.target.value)}
                disabled={isCalling || availableGrades.length === 0}
                className="w-full bg-[#1A1A1C] p-3 rounded-lg border border-[#333] text-sm focus:border-brand-red outline-none transition-colors text-white disabled:opacity-50"
              >
                {availableGrades.length > 0 ? (
                  availableGrades.map(g => <option key={g} value={g}>{g}학년</option>)
                ) : (
                  <option value="1">1학년</option> // Fallback
                )}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase text-[#777] font-bold mb-2 block tracking-wider">Class (반)</label>
              <select 
                value={classNm}
                onChange={e => setClassNm(e.target.value)}
                disabled={isCalling || availableClasses.length === 0}
                className="w-full bg-[#1A1A1C] p-3 rounded-lg border border-[#333] text-sm focus:border-brand-red outline-none transition-colors text-white disabled:opacity-50"
              >
                {availableClasses.length > 0 ? (
                  availableClasses.map(c => <option key={c} value={c}>{c}반</option>)
                ) : (
                  <option value="1">1반</option> // Fallback
                )}
              </select>
            </div>
          </section>
`;

content = content.replace(selectRegex, newSelect.trim());

fs.writeFileSync('src/components/OfficeRemote.tsx', content);
