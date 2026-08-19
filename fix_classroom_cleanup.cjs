const fs = require('fs');

const file = 'src/components/ClassroomDisplay.tsx';
let code = fs.readFileSync(file, 'utf8');

// The duplicate announcement trigger block
const oldAnnounceBlock = `  const prevAnnounceRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (prevAnnounceRef.current !== undefined) {
      if (announcement && announcement.trim() !== '' && announcement !== prevAnnounceRef.current) {
        setShowAnnouncePopup(true);
        alertSound.currentTime = 0;
        alertSound.play().catch(e => console.log('Audio play failed:', e));
        
        // Trigger Electron window focus/popup if running in Electron
        if (typeof window !== 'undefined') {
          if ((window as any).electron?.ipcRenderer) {
            (window as any).electron.ipcRenderer.send('trigger-my-call');
          }
        }

        const timer = setTimeout(() => {
          setShowAnnouncePopup(false);
        }, 15000);
        return () => clearTimeout(timer);
      }
    }
    prevAnnounceRef.current = announcement;
  }, [announcement]);`;

// The duplicate call state trigger block
const oldCallBlock = `  // Alert System
  useEffect(() => {
    if (state.callStatus && state.studentName) {
      setActiveAlert(state);
      alertSound.currentTime = 0;
      alertSound.play().catch(e => console.log('Audio play failed:', e));

      // Trigger Electron window focus/popup if running in Electron
      if (typeof window !== 'undefined') {
        if ((window as any).electron?.ipcRenderer) {
          (window as any).electron.ipcRenderer.send('trigger-my-call');
        }
      }
    } else {
      setActiveAlert(null);
    }
  }, [state]);`;

const newCallBlock = `  // Alert System
  useEffect(() => {
    if (state.studentName) {
      setActiveAlert(state);
    } else {
      setActiveAlert(null);
    }
  }, [state]);`;

code = code.replace(oldAnnounceBlock, "");
code = code.replace(oldCallBlock, newCallBlock);

// Remove any remaining socket effect
code = code.replace(/useEffect\(\(\) => \{\s*return \(\) => \{\s*\}\s*\}, \[\]\);\s*/g, '');

// Also let's make sure alertSound is played in the new triggers (lines 110-135)
const newTriggerCallBlock = `// Trigger electron popup when Call State changes (and is active)
  const previousStateRef = useRef(state);
  useEffect(() => {
    if (state.studentName && state.message && state.studentName !== previousStateRef.current.studentName) {
      alertSound.currentTime = 0;
      alertSound.play().catch(e => console.log('Audio play failed:', e));
      if (typeof window !== 'undefined' && (window as any).electron?.ipcRenderer) {
        (window as any).electron.ipcRenderer.send('trigger-my-call');
      }
    }
    previousStateRef.current = state;
  }, [state]);`;

const newTriggerAnnounceBlock = `// Trigger electron popup when Announcement changes
  const prevUpdatedAtRef = useRef(lastUpdatedAt);
  useEffect(() => {
    if (lastUpdatedAt > 0 && lastUpdatedAt !== prevUpdatedAtRef.current) {
      setShowAnnouncePopup(true);
      alertSound.currentTime = 0;
      alertSound.play().catch(e => console.log('Audio play failed:', e));
      if (typeof window !== 'undefined' && (window as any).electron?.ipcRenderer) {
        (window as any).electron.ipcRenderer.send('trigger-my-call');
      }
      const timer = setTimeout(() => {
        setShowAnnouncePopup(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
    prevUpdatedAtRef.current = lastUpdatedAt;
  }, [lastUpdatedAt]);`;

// Just string replace the whole chunk:
const regexTriggers = /\/\/ Trigger electron popup when Call State changes.*?\}, \[lastUpdatedAt\]\);/s;

code = code.replace(regexTriggers, newTriggerCallBlock + "\n\n  " + newTriggerAnnounceBlock);

fs.writeFileSync(file, code);
