const fs = require('fs');
let content = fs.readFileSync('src/components/ClassroomDisplay.tsx', 'utf8');

// The closing tags part to replace:
const oldPart = `
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        
        ) : (
`;

const newPart = `
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
        
        ) : (
`;

content = content.replace(oldPart, newPart);
fs.writeFileSync('src/components/ClassroomDisplay.tsx', content);
