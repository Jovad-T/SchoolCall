const fs = require('fs');
let content = fs.readFileSync('src/components/ClassroomDisplay.tsx', 'utf8');

// Add state for Wake Lock
const wakeLockStateCode = `
  const [activeAlert, setActiveAlert] = useState<CallState | null>(null);
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          setIsWakeLockActive(true);
          
          wakeLockRef.current.addEventListener('release', () => {
            setIsWakeLockActive(false);
          });
        }
      } catch (err) {
        console.error('Wake Lock error:', err);
        setIsWakeLockActive(false);
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
`;

content = content.replace("const [activeAlert, setActiveAlert] = useState<CallState | null>(null);", wakeLockStateCode);

// Add WakeLock UI Icon next to the time/settings
const oldHeader = `
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowSettingsModal(true)}
                className="p-3 bg-[#111] border border-[#333] rounded-full hover:bg-[#222] transition-colors"
              >
                <Settings className="w-5 h-5 text-[#888]" />
              </button>
            </div>
`;

const newHeader = `
            <div className="flex items-center gap-4">
              {isWakeLockActive && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#111] border border-brand-green/30 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                  <span className="text-[10px] font-bold text-brand-green tracking-wider">화면 켜짐 유지</span>
                </div>
              )}
              <button 
                onClick={() => setShowSettingsModal(true)}
                className="p-3 bg-[#111] border border-[#333] rounded-full hover:bg-[#222] transition-colors"
              >
                <Settings className="w-5 h-5 text-[#888]" />
              </button>
            </div>
`;

content = content.replace(oldHeader, newHeader);

fs.writeFileSync('src/components/ClassroomDisplay.tsx', content);
