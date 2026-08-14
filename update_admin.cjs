const fs = require('fs');

let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// We need to add useEffect and onValue for fetching the schedule
content = content.replace(
  "import { ref, set } from 'firebase/database';",
  "import { ref, set, onValue } from 'firebase/database';"
);

content = content.replace(
  "import React, { useRef, useState } from 'react';",
  "import React, { useRef, useState, useEffect } from 'react';"
);

content = content.replace(
  "import { Upload, Home } from 'lucide-react';",
  "import { Upload, Home, Clock } from 'lucide-react';"
);

// Add schedule state
const stateHook = `
  const [schedule, setSchedule] = useState<{period: number; start: string; end: string}[]>(
    Array.from({length: 7}, (_, i) => ({ period: i + 1, start: '', end: '' }))
  );
  const [scheduleStatus, setScheduleStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;
    const scheduleRef = ref(db, 'school_data/schedule');
    const unsub = onValue(scheduleRef, (snapshot) => {
      if (snapshot.exists()) {
        setSchedule(snapshot.val());
      }
    });
    return () => unsub();
  }, []);

  const handleScheduleChange = (index: number, field: 'start' | 'end', value: string) => {
    const newSchedule = [...schedule];
    newSchedule[index][field] = value;
    setSchedule(newSchedule);
  };

  const saveSchedule = async () => {
    if (!db) {
      alert("Firebase 연결이 필요합니다.");
      return;
    }
    try {
      await set(ref(db, 'school_data/schedule'), schedule);
      setScheduleStatus("✅ 일과시간이 성공적으로 저장되었습니다.");
      setTimeout(() => setScheduleStatus(null), 3000);
    } catch (err) {
      console.error(err);
      alert("저장 중 오류가 발생했습니다.");
    }
  };
`;

content = content.replace(
  "const [isUploading, setIsUploading] = useState(false);",
  "const [isUploading, setIsUploading] = useState(false);\n" + stateHook
);

const jsxToAdd = `
        <div className="glass-card p-10 rounded-2xl border border-brand-blue/30 flex flex-col items-center w-full">
          <div className="flex items-center gap-3 mb-6 w-full justify-center">
            <Clock className="w-6 h-6 text-brand-blue" />
            <h2 className="text-xl font-bold tracking-widest text-white">학교 일과시간 설정</h2>
          </div>
          <p className="text-[#888] text-xs tracking-wider mb-8 text-center">
            설정된 시간 동안에는 교실 칠판에 호출 알림이 울리지 않습니다. (방해금지 모드)
          </p>
          
          <div className="w-full space-y-3 mb-8">
            {schedule.map((slot, idx) => (
              <div key={idx} className="flex items-center justify-between gap-4 p-3 bg-[#111] rounded-xl border border-[#333]">
                <div className="font-bold text-brand-blue w-16">{slot.period}교시</div>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={slot.start}
                    onChange={(e) => handleScheduleChange(idx, 'start', e.target.value)}
                    className="flex-1 bg-[#1A1A1C] p-2 rounded-lg border border-[#444] text-white outline-none focus:border-brand-blue text-center text-sm"
                  />
                  <span className="text-[#555]">~</span>
                  <input
                    type="time"
                    value={slot.end}
                    onChange={(e) => handleScheduleChange(idx, 'end', e.target.value)}
                    className="flex-1 bg-[#1A1A1C] p-2 rounded-lg border border-[#444] text-white outline-none focus:border-brand-blue text-center text-sm"
                  />
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={saveSchedule}
            className="w-full bg-brand-blue text-black py-4 rounded-xl font-black text-sm tracking-widest hover:brightness-110 transition-all shadow-[0_0_15px_rgba(0,195,255,0.3)]"
          >
            일과표 저장
          </button>
          
          {scheduleStatus && (
            <div className="mt-6 w-full text-center px-4 py-4 bg-[#1A1A1C] border border-brand-green/30 text-brand-green text-sm rounded-lg shadow-lg">
              {scheduleStatus}
            </div>
          )}
        </div>
`;

content = content.replace(
  "</div>\n      </div>\n    </div>",
  "</div>\n" + jsxToAdd + "\n      </div>\n    </div>"
);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
