const fs = require('fs');
const content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const newUI = `
        {/* 교사 시간표 자동 매핑 */}
        <div className="glass-card p-10 rounded-2xl border border-purple-500/30 flex flex-col items-center w-full mb-12">
          <div className="flex items-center gap-3 mb-6 w-full justify-center">
            <School className="w-6 h-6 text-purple-500" />
            <h2 className="text-xl font-bold tracking-widest text-white">교사 시간표 자동 매핑 (Vision AI)</h2>
          </div>
          <p className="text-[#888] text-xs tracking-wider mb-8 text-center">
            학교 전체 또는 반 시간표 이미지를 업로드하면 AI가 분석하여<br/>
            등록된 선생님들의 개별 시간표에 자동으로 매핑해 줍니다.
          </p>

          <div className="w-full max-w-xl mx-auto flex flex-col items-center">
            <div className="relative w-full h-24 mb-4 border-2 border-dashed border-[#444] hover:border-purple-500 rounded-xl bg-[#111] transition-colors flex items-center justify-center cursor-pointer group">
              <input 
                type="file" 
                accept="image/png, image/jpeg" 
                onChange={handleExtractTeacherSchedule}
                disabled={isExtractingTeacher}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
              />
              <div className="flex flex-col items-center gap-2 text-[#666] group-hover:text-purple-500 transition-colors">
                {isExtractingTeacher ? (
                  <span className="animate-pulse flex items-center gap-2 font-bold"><Wand2 className="w-5 h-5 animate-spin"/> AI 분석 중...</span>
                ) : (
                  <>
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-xs font-bold tracking-widest">시간표 이미지 첨부 (.png, .jpg)</span>
                  </>
                )}
              </div>
            </div>
            {teacherTtStatus && (
              <div className="w-full text-center px-4 py-3 bg-[#1A1A1C] border border-purple-500/30 text-purple-400 text-sm rounded-lg shadow-lg">
                {teacherTtStatus}
              </div>
            )}
          </div>
        </div>
`;

const updated = content.replace('{/* Meal Management */}', newUI + '\n        {/* Meal Management */}');
fs.writeFileSync('src/components/AdminDashboard.tsx', updated);
