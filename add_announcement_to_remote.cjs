const fs = require('fs');
let content = fs.readFileSync('src/components/OfficeRemote.tsx', 'utf8');

// Update Import
content = content.replace(
  "import { useCallState, useLocalRoster, useSchoolStructure } from '../lib/store';",
  "import { useCallState, useLocalRoster, useSchoolStructure, useClassAnnouncement } from '../lib/store';"
);

// Add state
const hookCall = `
  const { roster, isLoading } = useLocalRoster(grade, classNm);
  const { structure, isLoading: isStructureLoading } = useSchoolStructure();
  const { announcement, updateAnnouncement } = useClassAnnouncement(grade, classNm);
  const [announcementInput, setAnnouncementInput] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  
  useEffect(() => {
    setAnnouncementInput(announcement || '');
  }, [announcement]);

  const handleSaveAnnouncement = () => {
    updateAnnouncement(announcementInput);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };
`;
content = content.replace(
  "const { roster, isLoading } = useLocalRoster(grade, classNm);\n  const { structure, isLoading: isStructureLoading } = useSchoolStructure();",
  hookCall.trim()
);

// Add UI before Action Buttons
const uiCode = `
        {/* Class Announcement */}
        <section className="bg-[#111] p-5 rounded-xl border border-[#333] mb-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-[10px] uppercase text-brand-red font-bold tracking-wider">학급 전달사항</label>
            {isSaved && <span className="text-[10px] text-brand-green font-bold">저장됨 ✓</span>}
          </div>
          <div className="flex flex-col gap-2">
            <textarea
              value={announcementInput}
              onChange={e => setAnnouncementInput(e.target.value)}
              placeholder="오늘의 조례/종례 전달사항을 입력하세요..."
              className="w-full bg-[#0A0A0C] p-3 rounded-lg border border-[#222] text-xs text-white focus:border-brand-red outline-none transition-colors h-20 resize-none"
            />
            <button
              onClick={handleSaveAnnouncement}
              disabled={isCalling}
              className="w-full bg-[#1A1A1C] text-white py-2 rounded-lg font-bold text-xs hover:bg-[#222] border border-[#333] transition-colors"
            >
              전달사항 업데이트
            </button>
          </div>
        </section>

        {/* Action Buttons */}
`;
content = content.replace("{/* Action Buttons */}", uiCode.trim());

fs.writeFileSync('src/components/OfficeRemote.tsx', content);
