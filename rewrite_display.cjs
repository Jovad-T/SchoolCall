const fs = require('fs');
let content = fs.readFileSync('src/components/ClassroomDisplay.tsx', 'utf8');

// I need to add useClassAnnouncement hook.
// Since the previous script failed, it might not be there. Let's check:
if (!content.includes('useClassAnnouncement')) {
  content = content.replace(
    "import { useCallState } from '../lib/store';",
    "import { useCallState, useClassAnnouncement } from '../lib/store';"
  );

  content = content.replace(
    "const classId = `${settings.grade}-${settings.classNm}`;",
    "const classId = `${settings.grade}-${settings.classNm}`;\n  const { announcement } = useClassAnnouncement(settings.grade, settings.classNm);"
  );
}

// Revert the messed up layout.
// Let's find the '{/* Widgets */}' block and just replace the whole section until '{/* Settings Button */}' or ') : ('
// Since I already modified it, let's look for '{/* Widgets */}' and ') : ('
const startIndex = content.indexOf('{/* Widgets */}');
const endIndex = content.indexOf(') : (', startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const beforeWidgets = content.substring(0, startIndex);
  const afterWidgets = content.substring(endIndex);

  const newWidgets = `
            {/* Widgets & Announcements */}
            <div className="flex-1 flex justify-center w-full mt-4 pb-8 overflow-y-auto custom-scrollbar">
              <div className="flex flex-col gap-8 w-full max-w-6xl">
                
                {/* Top: Timetable and Meals */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
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

                  {/* Right: Meals */}
                  <div className="flex flex-col gap-4 relative">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-brand-blue rounded-full animate-pulse" />
                      <h3 className="text-sm uppercase font-semibold text-[#888]">오늘의 급식</h3>
                    </div>

                    {isLoadingNeis ? (
                       <div className="text-[#555] p-6 text-center border border-[#333] rounded-xl border-dashed h-full flex items-center justify-center">
                         시간표와 급식을 불러오는 중입니다...
                       </div>
                    ) : neisError || (lunch.length === 0 && dinner.length === 0) ? (
                      <div className="text-[#555] p-6 text-center border border-[#333] rounded-xl border-dashed h-full flex items-center justify-center">
                        오늘은 등록된 급식이 없습니다.
                      </div>
                    ) : (
                      <div className="grid grid-rows-2 gap-4 h-full">
                        {/* Lunch Block */}
                        {lunch.length > 0 && (
                          <div className="glass-card p-6 rounded-2xl border-t-4 border-t-brand-blue flex flex-col justify-center relative">
                            <div className="absolute top-4 left-6 flex items-center gap-2">
                              <Utensils className="w-4 h-4 text-brand-blue/50" />
                              <span className="text-brand-blue text-xs font-bold tracking-wider">점심</span>
                            </div>
                            <div className="flex flex-col gap-2 text-center mt-6">
                              {lunch.map((item, idx) => (
                                <div key={idx} className="text-xl font-bold tracking-tight text-white">
                                  {item}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Dinner Block */}
                        {dinner.length > 0 && (
                          <div className="glass-card p-6 rounded-2xl border-t-4 border-t-brand-blue/60 flex flex-col justify-center relative">
                            <div className="absolute top-4 left-6 flex items-center gap-2">
                              <Utensils className="w-4 h-4 text-brand-blue/30" />
                              <span className="text-brand-blue/60 text-xs font-bold tracking-wider">저녁</span>
                            </div>
                            <div className="flex flex-col gap-2 text-center mt-6">
                              {dinner.map((item, idx) => (
                                <div key={idx} className="text-xl font-bold tracking-tight text-[#CCC]">
                                  {item}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom: Teacher Announcements */}
                <div className="flex flex-col gap-4 mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-brand-red rounded-full animate-pulse" />
                    <h3 className="text-sm uppercase font-semibold text-[#888]">선생님의 전달사항</h3>
                  </div>
                  <div className="glass-card p-6 md:p-10 rounded-2xl border-t-4 border-t-brand-red min-h-[160px] flex items-center justify-center relative">
                    {announcement ? (
                      <p className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-relaxed whitespace-pre-wrap text-center w-full">
                        {announcement}
                      </p>
                    ) : (
                      <p className="text-xl md:text-2xl font-semibold tracking-tight text-[#555] text-center w-full">
                        오늘 등록된 전달사항이 없습니다.
                      </p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        
        `;
  
  content = beforeWidgets + newWidgets.trimStart() + afterWidgets;
}

fs.writeFileSync('src/components/ClassroomDisplay.tsx', content);
