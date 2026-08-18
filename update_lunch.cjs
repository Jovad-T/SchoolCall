const fs = require('fs');
let content = fs.readFileSync('src/components/ClassroomDisplay.tsx', 'utf8');

// Add dinner state
content = content.replace(
  "const [lunch, setLunch] = useState<string[]>([]);",
  "const [lunch, setLunch] = useState<string[]>([]);\n  const [dinner, setDinner] = useState<string[]>([]);"
);

// Update Parse Lunch to Parse Meals (Lunch and Dinner)
const parseMealLogic = `
        // Parse Meals
        if (lunchData.mealServiceDietInfo && lunchData.mealServiceDietInfo[1].row) {
          const rows = lunchData.mealServiceDietInfo[1].row;
          
          let parsedLunch: string[] = [];
          let parsedDinner: string[] = [];
          
          rows.forEach((row: any) => {
            const rawMenu = row.DDISH_NM;
            const cleaned = rawMenu
              .split('<br/>')
              .map((item: string) => item.replace(/[0-9.]/g, '').replace(/[^가-힣a-zA-Z\\s]/g, '').trim())
              .filter(Boolean);
            
            // MMEAL_SC_CODE: 1=조식, 2=중식, 3=석식
            if (row.MMEAL_SC_CODE === '2') {
              parsedLunch = cleaned;
            } else if (row.MMEAL_SC_CODE === '3') {
              parsedDinner = cleaned;
            }
          });
          
          setLunch(parsedLunch);
          setDinner(parsedDinner);
        } else {
          setLunch([]);
          setDinner([]);
        }
`;

content = content.replace(
  /        \/\/ Parse Lunch[\s\S]*?        \} else \{\n          setLunch\(\[\]\);\n        \}/,
  parseMealLogic.trim()
);

// Update UI
const oldMealUI = `
                {/* Right: Lunch */}
                <div className="flex flex-col gap-4 relative">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-brand-blue rounded-full animate-pulse" />
                    <h3 className="text-sm uppercase font-semibold text-[#888]">오늘의 급식</h3>
                  </div>

                  {isLoadingNeis ? (
                     <div className="text-[#555] p-6 text-center border border-[#333] rounded-xl border-dashed">
                       시간표와 급식을 불러오는 중입니다...
                     </div>
                  ) : neisError || lunch.length === 0 ? (
                    <div className="text-[#555] p-6 text-center border border-[#333] rounded-xl border-dashed">
                      오늘은 등록된 급식이 없습니다.
                    </div>
                  ) : (
                    <div className="glass-card p-8 rounded-2xl border-t-4 border-t-brand-blue h-full">
                      <div className="flex justify-center mb-8">
                        <Utensils className="w-12 h-12 text-brand-blue/50" />
                      </div>
                      <div className="flex flex-col gap-4 text-center">
                        {lunch.map((item, idx) => (
                          <div key={idx} className="text-2xl font-bold tracking-tight text-white">
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
`;

const newMealUI = `
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
`;

content = content.replace(oldMealUI.trim(), newMealUI.trim());
fs.writeFileSync('src/components/ClassroomDisplay.tsx', content);
