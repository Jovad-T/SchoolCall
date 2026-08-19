const fs = require('fs');
const content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const cellComponent = `
const TimetableCell = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  
  // Extract subject and teacher
  const parts = value.split(/[/\n]/);
  const subject = parts[0]?.trim() || '';
  const teacher = parts.slice(1).join('/').trim() || '';

  if (isEditing) {
    return (
      <textarea
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setIsEditing(false)}
        className="w-full bg-[#1A1A1C] p-3 rounded-xl border border-brand-green text-white outline-none text-center text-sm min-h-[4rem] resize-none break-keep whitespace-pre-wrap"
        placeholder="과목명/교사명"
      />
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className="w-full bg-[#1A1A1C] p-3 rounded-xl border border-[#444] hover:border-brand-green cursor-text flex flex-col justify-center items-center min-h-[4rem] transition-colors"
    >
      {value ? (
        <>
          <span className="font-bold text-white text-sm break-keep text-center leading-tight">{subject}</span>
          {teacher && <span className="text-[11px] text-white/70 mt-1 break-keep text-center">{teacher}</span>}
        </>
      ) : (
        <span className="text-[#555] text-[10px]">입력</span>
      )}
    </div>
  );
};

export default function AdminDashboard() {`;

let updated = content.replace('export default function AdminDashboard() {', cellComponent);

// Increase main max-w to max-w-5xl
updated = updated.replace('<div className="max-w-xl w-full text-center space-y-12">', '<div className="max-w-5xl w-full text-center space-y-12">');

// Fix the timetable grid overflow and rendering
const oldGrid = `<div className="w-full overflow-x-auto custom-scrollbar">

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
          </div>`;

const newGrid = `<div className="w-full overflow-x-auto scrollbar-hide">
            {/* 시원한 넓은 레이아웃으로 변경 (최소 너비를 확보하여 모바일에서도 깨지지 않고 스와이프 가능) */}
            <div className="min-w-[800px] mb-8 w-full">
              <div className="grid grid-cols-6 gap-3 mb-3">
                <div className="text-center text-[#555] font-bold text-xs self-center">교시</div>
                {['월요일', '화요일', '수요일', '목요일', '금요일'].map((d, i) => (
                  <div key={i} className="text-center text-white font-bold text-sm bg-[#222] py-3 rounded-xl shadow-inner">{d}</div>
                ))}
              </div>
              
              {Array.from({length: 7}).map((_, pIdx) => (
                <div key={pIdx} className="grid grid-cols-6 gap-3 mb-3 items-stretch">
                  <div className="text-center text-brand-green font-bold text-sm self-center bg-brand-green/10 py-3 rounded-xl border border-brand-green/20">
                    {pIdx + 1}교시
                  </div>
                  {[1, 2, 3, 4, 5].map((d) => (
                    <TimetableCell
                      key={d}
                      value={localTimetable[d.toString()]?.[pIdx] || ''}
                      onChange={(val) => handleTimetableChange(d.toString(), pIdx, val)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>`;

updated = updated.replace(oldGrid, newGrid);

fs.writeFileSync('src/components/AdminDashboard.tsx', updated);
