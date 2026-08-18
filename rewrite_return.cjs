const fs = require('fs');
let content = fs.readFileSync('src/components/ClassroomDisplay.tsx', 'utf8');

const returnRegex = /  return \([\s\S]*\}\;/;

const newReturn = `
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden font-sans relative">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#111] via-black to-black opacity-80" />
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay" />
      </div>

      {!settings && (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/80 backdrop-blur-sm">
          <div className="glass-card p-10 rounded-3xl text-center max-w-md w-full border border-[#333]">
            <h2 className="text-3xl font-black mb-4 tracking-tighter">초기 설정 필요</h2>
            <p className="text-[#888] mb-8">
              우측 상단의 톱니바퀴 아이콘을 눌러<br />현재 학급을 설정해주세요.
            </p>
            <div className="animate-bounce">
              <Settings className="w-8 h-8 text-[#555] mx-auto" />
            </div>
          </div>
        </div>
      )}

      {/* Settings Button */}
      <button 
        onClick={() => setShowSettingsModal(true)}
        className="absolute top-6 right-6 z-40 p-3 rounded-full bg-neutral-900/50 hover:bg-neutral-800 text-neutral-500 hover:text-brand-green transition-colors backdrop-blur"
      >
        <Settings className="w-6 h-6" />
      </button>

      <AnimatePresence mode="wait">
        {!activeAlert ? (
          <motion.div 
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full h-screen flex flex-col p-12 lg:p-20 relative z-10"
          >
            {/* Header: Date & Time */}
            <header className="flex justify-between items-end mb-10 border-b border-[#1A1A1A] pb-8">
              <div>
                <h2 className="text-[#555] uppercase tracking-widest text-xs mb-1">
                  실시간 학급 대시보드
                </h2>
                <h1 className="text-4xl font-bold tracking-tighter">
                  {settings ? \`\${settings.grade}학년 \${settings.classNm}반 알림판\` : "우리 반 알림판"}
                </h1>
              </div>
              <div className="text-right">
                <div className="text-5xl font-black tracking-tighter mb-2 font-mono">
                  {timeString}
                </div>
                <div className="text-xs text-[#555] uppercase mt-2">{dateString}</div>
              </div>
            </header>

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
        
        ) : (
          <motion.div
            key="calling"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-12 z-50 m-4 rounded-3xl"
            style={{
              backgroundColor: 'rgba(10, 10, 10, 0.95)',
              border: '8px double #39ff14',
              boxShadow: '0 0 30px #39ff14, inset 0 0 30px #39ff14'
            }}
          >
            <div className="text-center w-full flex flex-col items-center">
              <motion.h2 
                className="text-[130px] font-black leading-none mb-6 tracking-tighter"
                style={{
                  color: '#fff0f5',
                  textShadow: '0 0 10px #ff073a, 0 0 20px #ff073a, 0 0 40px #ff073a, 0 0 80px #ff073a, 0 0 120px #ff073a',
                  WebkitTextStroke: '2px #ff0055'
                }}
                animate={{ scale: [1, 1.05, 1], rotate: [-1, 1, -1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                {activeAlert.studentName}
              </motion.div>
              
              <motion.div 
                className="bg-black/80 px-12 py-6 rounded-full border-4 border-[#ff073a] shadow-[0_0_30px_rgba(255,7,58,0.5)]"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <p className="text-5xl font-bold tracking-tight text-white flex items-center gap-6">
                  <span>{activeAlert.message}</span>
                  <span className="text-[#ff073a]">|</span>
                  <span className="text-[#aaa]">{activeAlert.location}</span>
                </p>
              </motion.div>
              
              {activeAlert.teacherName && (
                <div className="mt-12 text-2xl text-[#888] font-bold tracking-widest uppercase">
                  호출자: {activeAlert.teacherName} 선생님
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettingsModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-6"
          >
            <div className="glass-card max-w-md w-full p-8 rounded-3xl border border-[#333]">
              <h2 className="text-2xl font-bold mb-6 tracking-widest uppercase">학급 설정</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase text-[#777] font-bold mb-2 block tracking-wider">학년</label>
                    <select 
                      value={tempSettings.grade}
                      onChange={e => setTempSettings({...tempSettings, grade: e.target.value})}
                      className="w-full bg-[#1A1A1C] p-3 rounded-lg border border-[#333] text-sm focus:border-brand-green outline-none transition-colors text-white"
                    >
                      {[1, 2, 3].map(g => <option key={g} value={g}>{g}학년</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-[#777] font-bold mb-2 block tracking-wider">반</label>
                    <select 
                      value={tempSettings.classNm}
                      onChange={e => setTempSettings({...tempSettings, classNm: e.target.value})}
                      className="w-full bg-[#1A1A1C] p-3 rounded-lg border border-[#333] text-sm focus:border-brand-green outline-none transition-colors text-white"
                    >
                      {Array.from({length: 15}, (_, i) => i + 1).map(c => <option key={c} value={c}>{c}반</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                {settings && (
                  <button 
                    onClick={() => setShowSettingsModal(false)}
                    className="flex-1 bg-[#1A1A1C] text-[#555] py-3 rounded-xl font-bold text-xs tracking-widest border border-[#333] hover:text-[#777] hover:bg-[#222] transition-colors"
                  >
                    취소
                  </button>
                )}
                <button 
                  onClick={handleSaveSettings}
                  className="flex-1 bg-brand-green text-black py-3 rounded-xl font-black text-xs tracking-widest shadow-[0_0_15px_rgba(0,255,136,0.3)] hover:brightness-110 transition-all"
                >
                  저장 및 적용
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
`;

const index = content.indexOf('  return (');
content = content.substring(0, index) + newReturn;

fs.writeFileSync('src/components/ClassroomDisplay.tsx', content);
