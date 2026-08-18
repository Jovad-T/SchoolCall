const fs = require('fs');
let content = fs.readFileSync('src/components/ClassroomDisplay.tsx', 'utf8');

// 1. Add state for showAnnouncePopup and prevAnnounceRef
const stateCode = `
  const [activeAlert, setActiveAlert] = useState<CallState | null>(null);
  
  const [showAnnouncePopup, setShowAnnouncePopup] = useState(false);
  const prevAnnounceRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (prevAnnounceRef.current !== undefined) {
      if (announcement && announcement.trim() !== '' && announcement !== prevAnnounceRef.current) {
        setShowAnnouncePopup(true);
        alertSound.currentTime = 0;
        alertSound.play().catch(e => console.log('Audio play failed:', e));
        
        const timer = setTimeout(() => {
          setShowAnnouncePopup(false);
        }, 15000);
        return () => clearTimeout(timer);
      }
    }
    prevAnnounceRef.current = announcement;
  }, [announcement]);
`;

content = content.replace("const [activeAlert, setActiveAlert] = useState<CallState | null>(null);", stateCode);

// 2. Modify rendering block
const oldRenderBlockStart = `
      <AnimatePresence mode="wait">
        {!activeAlert ? (
          <motion.div 
            key="idle"
`;
const newRenderBlockStart = `
      <AnimatePresence mode="wait">
        {activeAlert ? (
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
              </motion.h2>
              
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
        ) : showAnnouncePopup ? (
          <motion.div
            key="announcement-popup"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-12 z-50 m-4 rounded-3xl cursor-pointer"
            onClick={() => setShowAnnouncePopup(false)}
            style={{
              backgroundColor: 'rgba(10, 10, 10, 0.95)',
              border: '8px double #ffcc00',
              boxShadow: '0 0 30px #ffcc00, inset 0 0 30px #ffcc00'
            }}
          >
            <div className="text-center w-full flex flex-col items-center">
              <div className="flex items-center gap-6 mb-8 text-[#ffcc00]">
                <Megaphone className="w-24 h-24 animate-pulse" />
                <h2 className="text-6xl font-black tracking-widest uppercase">새로운 전달사항</h2>
              </div>
              
              <motion.div 
                className="bg-black/80 px-16 py-12 rounded-3xl border-4 border-[#ffcc00] shadow-[0_0_30px_rgba(255,204,0,0.3)] max-w-5xl w-full"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <p className="text-5xl md:text-6xl font-bold tracking-tight text-white leading-relaxed whitespace-pre-wrap">
                  {announcement}
                </p>
              </motion.div>
              
              <div className="mt-12 text-xl text-[#888] font-bold tracking-widest">
                클릭하여 닫기 (잠시 후 자동 닫힘)
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="idle"
`;

content = content.replace(oldRenderBlockStart, newRenderBlockStart);

// Now remove the old activeAlert block from the bottom
const oldActiveAlertBlock = `
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
              </motion.h2>
              
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
`;

const endOfIdle = `
        )}
`;

content = content.replace(oldActiveAlertBlock, endOfIdle);

fs.writeFileSync('src/components/ClassroomDisplay.tsx', content);
