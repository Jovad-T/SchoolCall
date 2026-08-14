const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// Add School icon import if not present
if (!content.includes('School')) {
  content = content.replace("import { Upload, Home, Clock }", "import { Upload, Home, Clock, School }");
}

// State & Save logic
const newStates = `
  const [schoolName, setSchoolName] = useState<string>('');
  const [schoolNameStatus, setSchoolNameStatus] = useState<string | null>(null);
`;
content = content.replace(
  "const [scheduleStatus, setScheduleStatus] = useState<string | null>(null);",
  "const [scheduleStatus, setScheduleStatus] = useState<string | null>(null);\n" + newStates
);

const fetchLogic = `    const nameRef = ref(db, 'school_data/school_name');
    const nameUnsub = onValue(nameRef, (snapshot) => {
      if (snapshot.exists()) {
        setSchoolName(snapshot.val());
      }
    });

    return () => {
      unsub();
      nameUnsub();
    };`;
content = content.replace(
  "return () => unsub();\n  }, []);",
  fetchLogic + "\n  }, []);"
);

const saveLogic = `
  const saveSchoolName = async () => {
    if (!db) {
      alert("Firebase 연결이 필요합니다.");
      return;
    }
    try {
      await set(ref(db, 'school_data/school_name'), schoolName);
      setSchoolNameStatus("✅ 학교명이 성공적으로 저장되었습니다.");
      setTimeout(() => setSchoolNameStatus(null), 3000);
    } catch (err) {
      console.error(err);
      alert("저장 중 오류가 발생했습니다.");
    }
  };
`;
content = content.replace(
  "const handleScheduleChange = ",
  saveLogic + "\n  const handleScheduleChange = "
);

const schoolNameUI = `
        <div className="glass-card p-10 rounded-2xl border border-brand-green/30 flex flex-col items-center w-full">
          <div className="flex items-center gap-3 mb-6 w-full justify-center">
            <School className="w-6 h-6 text-brand-green" />
            <h2 className="text-xl font-bold tracking-widest text-white">학교명 설정</h2>
          </div>
          <p className="text-[#888] text-xs tracking-wider mb-8 text-center">
            메인 화면에 표시될 우리 학교의 이름을 설정합니다.
          </p>
          
          <div className="w-full flex gap-3 mb-4">
            <input 
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="예: 사직여자고등학교"
              className="flex-1 bg-[#1A1A1C] p-4 rounded-xl border border-[#333] text-white outline-none focus:border-brand-green transition-colors text-sm"
            />
            <button 
              onClick={saveSchoolName}
              className="px-8 bg-brand-green text-black rounded-xl font-black text-sm tracking-widest hover:brightness-110 transition-all shadow-[0_0_15px_rgba(0,255,136,0.3)]"
            >
              저장
            </button>
          </div>

          {schoolNameStatus && (
            <div className="w-full text-center px-4 py-4 bg-[#1A1A1C] border border-brand-green/30 text-brand-green text-sm rounded-lg shadow-lg">
              {schoolNameStatus}
            </div>
          )}
        </div>
`;

content = content.replace(
  '<div className="glass-card p-10 rounded-2xl border border-brand-blue/30',
  schoolNameUI + '\n        <div className="glass-card p-10 rounded-2xl border border-brand-blue/30'
);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
