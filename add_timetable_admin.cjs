const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// Update imports
content = content.replace(
  "import { setGlobalStudents } from '../lib/store';",
  "import { setGlobalStudents, useSchoolStructure, useClassTimetable } from '../lib/store';"
);
content = content.replace(
  "import { Upload, Home, Clock, School } from 'lucide-react';",
  "import { Upload, Home, Clock, School, Calendar } from 'lucide-react';"
);

// Add state for Timetable Management
const hookCode = `
  const { structure, isLoading: isStructureLoading } = useSchoolStructure();
  const [ttGrade, setTtGrade] = useState<string>('');
  const [ttClassNm, setTtClassNm] = useState<string>('');
  const [ttStatus, setTtStatus] = useState<string | null>(null);

  const availableGrades = Object.keys(structure).sort((a, b) => Number(a) - Number(b));
  const availableClasses = ttGrade ? (structure[ttGrade] || []).sort((a, b) => Number(a) - Number(b)) : [];

  useEffect(() => {
    if (!isStructureLoading && availableGrades.length > 0) {
      if (!availableGrades.includes(ttGrade)) {
        setTtGrade(availableGrades[0]);
      } else if (availableClasses.length > 0 && !availableClasses.includes(ttClassNm)) {
        setTtClassNm(availableClasses[0]);
      }
    }
  }, [structure, ttGrade, ttClassNm, isStructureLoading, availableGrades, availableClasses]);

  const { customTimetable, updateCustomTimetable } = useClassTimetable(ttGrade, ttClassNm);
  const [localTimetable, setLocalTimetable] = useState<Record<string, string[]>>({
    "1": Array(7).fill(""),
    "2": Array(7).fill(""),
    "3": Array(7).fill(""),
    "4": Array(7).fill(""),
    "5": Array(7).fill("")
  });

  useEffect(() => {
    if (customTimetable && Object.keys(customTimetable).length > 0) {
      // Ensure all 5 days exist
      const merged = { ...localTimetable };
      for (let i = 1; i <= 5; i++) {
        merged[i.toString()] = customTimetable[i.toString()] || Array(7).fill("");
      }
      setLocalTimetable(merged);
    } else {
      setLocalTimetable({
        "1": Array(7).fill(""),
        "2": Array(7).fill(""),
        "3": Array(7).fill(""),
        "4": Array(7).fill(""),
        "5": Array(7).fill("")
      });
    }
  }, [customTimetable, ttGrade, ttClassNm]);

  const handleTimetableChange = (day: string, periodIndex: number, value: string) => {
    const newTt = { ...localTimetable };
    newTt[day][periodIndex] = value;
    setLocalTimetable(newTt);
  };

  const handleSaveTimetable = async () => {
    await updateCustomTimetable(localTimetable);
    setTtStatus("✅ 시간표가 저장되었습니다.");
    setTimeout(() => setTtStatus(null), 3000);
  };
`;

content = content.replace(
  "const [schoolNameStatus, setSchoolNameStatus] = useState<string | null>(null);",
  "const [schoolNameStatus, setSchoolNameStatus] = useState<string | null>(null);\n" + hookCode
);

const days = ["월", "화", "수", "목", "금"];

const timetableUI = `
        {/* Class Timetable Management */}
        <div className="glass-card p-10 rounded-2xl border border-brand-green/30 flex flex-col items-center w-full mb-12">
          <div className="flex items-center gap-3 mb-6 w-full justify-center">
            <Calendar className="w-6 h-6 text-brand-green" />
            <h2 className="text-xl font-bold tracking-widest text-white">각 반 시간표 직접 입력</h2>
          </div>
          <p className="text-[#888] text-xs tracking-wider mb-8 text-center">
            이 곳에 입력한 시간표가 교실 TV에 최우선으로 반영됩니다. 비워두면 나이스(NEIS) 데이터를 가져옵니다.
          </p>

          <div className="flex items-center gap-4 w-full max-w-md mb-8">
            <div className="flex-1">
              <label className="text-[10px] uppercase text-[#777] font-bold mb-2 block tracking-wider">학년</label>
              <select 
                value={ttGrade}
                onChange={e => setTtGrade(e.target.value)}
                className="w-full bg-[#1A1A1C] p-3 rounded-lg border border-[#444] text-white focus:border-brand-green outline-none transition-colors"
              >
                {availableGrades.map(g => <option key={g} value={g}>{g}학년</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[10px] uppercase text-[#777] font-bold mb-2 block tracking-wider">반</label>
              <select 
                value={ttClassNm}
                onChange={e => setTtClassNm(e.target.value)}
                className="w-full bg-[#1A1A1C] p-3 rounded-lg border border-[#444] text-white focus:border-brand-green outline-none transition-colors"
              >
                {availableClasses.map(c => <option key={c} value={c}>{c}반</option>)}
              </select>
            </div>
          </div>

          <div className="w-full overflow-x-auto custom-scrollbar">
            <div className="min-w-[600px] mb-8">
              <div className="grid grid-cols-6 gap-2 mb-2">
                <div className="text-center text-[#555] font-bold text-xs">교시</div>
                {['월', '화', '수', '목', '금'].map((d, i) => (
                  <div key={i} className="text-center text-white font-bold text-sm bg-[#222] py-2 rounded-lg">{d}</div>
                ))}
              </div>
              
              {Array.from({length: 7}).map((_, pIdx) => (
                <div key={pIdx} className="grid grid-cols-6 gap-2 mb-2 items-center">
                  <div className="text-center text-brand-green font-bold text-xs">{pIdx + 1}교시</div>
                  {[1, 2, 3, 4, 5].map((d) => (
                    <input
                      key={d}
                      type="text"
                      value={localTimetable[d.toString()]?.[pIdx] || ''}
                      onChange={(e) => handleTimetableChange(d.toString(), pIdx, e.target.value)}
                      className="w-full bg-[#1A1A1C] p-2 rounded-lg border border-[#444] text-white outline-none focus:border-brand-green text-center text-sm"
                      placeholder="과목명"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={handleSaveTimetable}
            className="w-full max-w-md bg-brand-green text-black py-4 rounded-xl font-black text-sm tracking-widest hover:brightness-110 transition-all shadow-[0_0_15px_rgba(0,255,136,0.3)]"
          >
            선택 학급 시간표 저장
          </button>
          
          {ttStatus && (
            <div className="mt-6 w-full max-w-md text-center px-4 py-4 bg-[#1A1A1C] border border-brand-green/30 text-brand-green text-sm rounded-lg shadow-lg">
              {ttStatus}
            </div>
          )}
        </div>
`;

// Insert the UI before "학교 일과시간 설정" which starts with `<div className="glass-card p-10 rounded-2xl border border-brand-blue/30`
const targetUIString = `<div className="glass-card p-10 rounded-2xl border border-brand-blue/30`;
content = content.replace(targetUIString, timetableUI.trim() + "\n\n        " + targetUIString);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
