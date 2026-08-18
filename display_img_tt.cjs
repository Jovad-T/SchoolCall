const fs = require('fs');
let content = fs.readFileSync('src/components/ClassroomDisplay.tsx', 'utf8');

// Imports
content = content.replace(
  "useClassAnnouncement, useClassTimetable } from '../lib/store';",
  "useClassAnnouncement, useClassTimetable, useClassTimetableImage } from '../lib/store';"
);

// Hooks
content = content.replace(
  "const { customTimetable } = useClassTimetable(settings?.grade || '', settings?.classNm || '');",
  "const { customTimetable } = useClassTimetable(settings?.grade || '', settings?.classNm || '');\n  const { timetableImage } = useClassTimetableImage(settings?.grade || '', settings?.classNm || '');"
);

// Display UI
const oldLeftTimetable = `
                  {/* Left: Timetable */}
                  <div className="flex flex-col gap-4 relative">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-brand-green rounded-full animate-pulse" />
                      <h3 className="text-sm uppercase font-semibold text-[#888]">오늘의 시간표</h3>
                    </div>
                    
                    {isLoadingNeis ? (
                      <div className="text-[#555] p-6 text-center border border-[#333] rounded-xl border-dashed">
                        시간표와 급식을 불러오는 중입니다...
                      </div>
                    ) : neisError || timetable.length === 0 ? (
                      <div className="text-[#555] p-6 text-center border border-[#333] rounded-xl border-dashed">
                        오늘은 등록된 시간표가 없습니다.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {timetable.map((subject, idx) => (
                          <div 
                            key={idx}
                            className="glass-card p-5 rounded-xl flex justify-between items-center border-l-4 border-l-brand-green"
                          >
                            <div className="flex items-center gap-6">
                              <span className="font-mono text-[#555] w-8 text-xl">
                                {idx + 1}TH
                              </span>
                              <span className="font-bold text-2xl tracking-tight">
                                {subject}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
`;

const newLeftTimetable = `
                  {/* Left: Timetable */}
                  <div className="flex flex-col gap-4 relative">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-brand-green rounded-full animate-pulse" />
                      <h3 className="text-sm uppercase font-semibold text-[#888]">오늘의 시간표</h3>
                    </div>
                    
                    {timetableImage ? (
                      <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-[#111] rounded-2xl border border-[#333] overflow-hidden p-2">
                        <img src={timetableImage} alt="시간표 이미지" className="object-contain w-full h-full max-h-[500px]" />
                      </div>
                    ) : isLoadingNeis ? (
                      <div className="text-[#555] p-6 text-center border border-[#333] rounded-xl border-dashed h-full flex items-center justify-center">
                        시간표와 급식을 불러오는 중입니다...
                      </div>
                    ) : neisError || timetable.length === 0 ? (
                      <div className="text-[#555] p-6 text-center border border-[#333] rounded-xl border-dashed h-full flex items-center justify-center">
                        오늘은 등록된 시간표가 없습니다.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {timetable.map((subject, idx) => (
                          <div 
                            key={idx}
                            className="glass-card p-5 rounded-xl flex justify-between items-center border-l-4 border-l-brand-green"
                          >
                            <div className="flex items-center gap-6">
                              <span className="font-mono text-[#555] w-8 text-xl">
                                {idx + 1}TH
                              </span>
                              <span className="font-bold text-2xl tracking-tight">
                                {subject}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
`;

content = content.replace(oldLeftTimetable.trim(), newLeftTimetable.trim());
fs.writeFileSync('src/components/ClassroomDisplay.tsx', content);
