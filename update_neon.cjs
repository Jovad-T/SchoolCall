const fs = require('fs');

let content = fs.readFileSync('src/components/ClassroomDisplay.tsx', 'utf8');

// 1. Insert State and countdown logic
const stateToInsert = `
  const [timeLeft, setTimeLeft] = useState<number>(30);

  useEffect(() => {
    if (activeAlert) {
      setTimeLeft(30);
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [activeAlert]);

  useEffect(() => {
    if (activeAlert && timeLeft === 0) {
      handleDismissAlert();
    }
  }, [timeLeft, activeAlert]);
`;

content = content.replace(
  'const [activeAlert, setActiveAlert] = useState<CallState | null>(null);',
  'const [activeAlert, setActiveAlert] = useState<CallState | null>(null);\n' + stateToInsert
);

// 2. Add style block to the return
const styleBlock = `
      <style>
        {\`
        @keyframes flicker {
          0%, 18%, 22%, 25%, 53%, 57%, 100% {
            opacity: 1;
          }
          20%, 24%, 55% {
            opacity: 0.7;
          }
        }
        \`}
      </style>
`;
content = content.replace(
  '<div className="min-h-screen bg-bg-dark text-[#E0E0E0] grid-bg overflow-hidden relative font-sans flex flex-col">',
  '<div className="min-h-screen bg-bg-dark text-[#E0E0E0] grid-bg overflow-hidden relative font-sans flex flex-col">\n' + styleBlock
);

// 3. Replace the active alert modal
const newModal = `
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
                  animation: 'flicker 3s infinite alternate'
                }}
              >
                {activeAlert.studentName}
              </motion.h2>
              <p 
                className="text-5xl font-black tracking-widest uppercase mt-2 mb-10"
                style={{
                  color: '#fff0f5',
                  textShadow: '0 0 10px #ff073a, 0 0 20px #ff073a, 0 0 40px #ff073a',
                  animation: 'flicker 4s infinite alternate-reverse'
                }}
              >
                {activeAlert.message}
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center items-center gap-6 mb-12">
                {activeAlert.teacherName && (
                  <div className="px-8 py-4 rounded-2xl flex items-center gap-4 text-white bg-black/60"
                       style={{ border: '2px solid #00ffff', boxShadow: '0 0 15px #00ffff, inset 0 0 10px #00ffff', textShadow: '0 0 5px #00ffff' }}>
                     <User className="w-8 h-8 text-[#00ffff]" style={{ filter: 'drop-shadow(0 0 5px #00ffff)' }} />
                     <span className="text-3xl font-black">{activeAlert.teacherName} 선생님</span>
                  </div>
                )}
                {activeAlert.location && (
                  <div className="px-8 py-4 rounded-2xl flex items-center gap-4 text-white bg-black/60"
                       style={{ border: '2px solid #00ffff', boxShadow: '0 0 15px #00ffff, inset 0 0 10px #00ffff', textShadow: '0 0 5px #00ffff' }}>
                     <MapPin className="w-8 h-8 text-[#00ffff]" style={{ filter: 'drop-shadow(0 0 5px #00ffff)' }} />
                     <span className="text-3xl font-black">도착 장소: {activeAlert.location}</span>
                  </div>
                )}
              </div>

              <div className="w-full max-w-4xl flex flex-col items-center">
                <p className="text-3xl font-black tracking-widest uppercase mb-8"
                   style={{
                     color: '#fff',
                     textShadow: '0 0 10px #fffb00, 0 0 20px #fffb00, 0 0 40px #fffb00'
                   }}>
                  호명된 학생은 즉시 교무실로 와주세요.
                </p>
                
                <div className="w-full h-6 rounded-full overflow-hidden border-2 border-[#39ff14] bg-black/50 relative" style={{ boxShadow: '0 0 15px #39ff14' }}>
                  <motion.div 
                    className="absolute top-0 left-0 h-full"
                    style={{ backgroundColor: '#39ff14', boxShadow: '0 0 20px #39ff14' }}
                    initial={{ width: '100%' }}
                    animate={{ width: \`\${(timeLeft / 30) * 100}%\` }}
                    transition={{ duration: 1, ease: 'linear' }}
                  />
                </div>
                <div className="flex justify-between items-center w-full mt-4">
                  <p className="text-[#39ff14] font-mono font-bold text-xl" style={{ textShadow: '0 0 5px #39ff14' }}>
                    {timeLeft}초 뒤 자동 닫힘
                  </p>
                  <button 
                    onClick={handleDismissAlert}
                    className="flex items-center gap-3 px-6 py-3 rounded-full bg-black/80 border-2 border-[#fffb00] text-white font-bold tracking-widest transition-all"
                    style={{ boxShadow: '0 0 10px #fffb00', textShadow: '0 0 5px #fffb00' }}
                  >
                    <CheckCircle className="w-5 h-5 text-[#fffb00]" style={{ filter: 'drop-shadow(0 0 5px #fffb00)' }} />
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
`;

content = content.replace(/\) : \(\s*<motion\.div\s*key="calling"[\s\S]*?<\/motion\.div>\s*\)\}/, newModal);

fs.writeFileSync('src/components/ClassroomDisplay.tsx', content);
