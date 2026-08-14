const fs = require('fs');
let content = fs.readFileSync('src/components/ClassroomDisplay.tsx', 'utf8');

// Ensure CallState is imported
if (!content.includes('import { useCallState, CallState }')) {
  content = content.replace("import { useCallState } from '../lib/store';", "import { useCallState, CallState } from '../lib/store';");
}
if (!content.includes('import { useRef } from')) {
  content = content.replace("import { useState, useEffect }", "import { useState, useEffect, useRef }");
}

// Remove old schedule state block and isClassTime block, up to the end of that useEffect
const stateHookRegex = /const \[schedule, setSchedule\] = useState[\s\S]*?\}, \[state\.callStatus, schedule\]\);/m;
content = content.replace(stateHookRegex, '');

// Inject new state and logic
const newLogic = `
  const [schedule, setSchedule] = useState<{period: number; start: string; end: string}[]>([]);
  const [pendingCalls, setPendingCalls] = useState<CallState[]>([]);
  const [activeAlert, setActiveAlert] = useState<CallState | null>(null);
  
  useEffect(() => {
    if (db) {
      const scheduleRef = ref(db, 'school_data/schedule');
      const unsub = onValue(scheduleRef, (snapshot) => {
        if (snapshot.exists()) {
          setSchedule(snapshot.val());
        }
      });
      return () => unsub();
    }
  }, []);

  const checkIsClassTime = (time: Date) => {
    const currentTotal = time.getHours() * 60 + time.getMinutes();
    for (const slot of schedule) {
      if (!slot.start || !slot.end) continue;
      const [sH, sM] = slot.start.split(':').map(Number);
      const [eH, eM] = slot.end.split(':').map(Number);
      const sTotal = sH * 60 + sM;
      const eTotal = eH * 60 + eM;
      if (currentTotal >= sTotal && currentTotal <= eTotal) {
        return true;
      }
    }
    return false;
  };

  const inClass = checkIsClassTime(currentTime);
  const prevInClass = useRef(inClass);
  const prevCallStatus = useRef(false);

  // New call interception logic
  useEffect(() => {
    if (state.callStatus && !prevCallStatus.current) {
      // Transition from false to true -> New call arrived
      if (checkIsClassTime(new Date())) {
        console.log("수업 중이라 알림이 대기열에 추가되었습니다:", state);
        setPendingCalls(prev => [...prev, state]);
      } else {
        setActiveAlert(state);
      }
    }
    
    if (!state.callStatus && prevCallStatus.current) {
       // Call was dismissed remotely
       setActiveAlert(null);
    }
    
    prevCallStatus.current = state.callStatus;
  }, [state]);

  // Recess observer logic
  useEffect(() => {
    if (prevInClass.current && !inClass) {
      // Transitioned from Class time -> Recess
      if (pendingCalls.length > 0) {
        console.log("쉬는 시간이 되어 대기열의 알림을 표시합니다.");
        const latestCall = pendingCalls[pendingCalls.length - 1];
        setActiveAlert(latestCall);
        setPendingCalls([]); // Initialize/clear queue
      }
    }
    prevInClass.current = inClass;
  }, [inClass, pendingCalls]);

  const handleDismissAlert = () => {
    setActiveAlert(null);
    updateState({
      callStatus: false,
      studentName: '',
      message: '',
      teacherName: '',
      location: ''
    });
  };
`;

content = content.replace(
  "const [neisError, setNeisError] = useState(false);",
  "const [neisError, setNeisError] = useState(false);\n" + newLogic
);

// We need to modify handleDismissAlert if it's already defined
// Wait, the original handleDismissAlert is:
/*
  const handleDismissAlert = () => {
    updateState({
      callStatus: false,
      studentName: '',
      message: '',
      teacherName: '',
      location: ''
    });
  };
*/
// It's defined higher up. Let's remove the original one.
content = content.replace(/const handleDismissAlert = \(\) => {[\s\S]*?};\s*/m, '');

// Modify the render block: 
// 1. Badge near settings
const badgeJSX = `
      {inClass && (
        <div className="absolute top-6 right-20 z-40 flex items-center gap-3">
          <div className="px-4 py-2 bg-[#1A1A1C] border border-[#333] rounded-full text-xs font-bold flex items-center gap-2 shadow-lg backdrop-blur text-brand-red">
            <span>🔇 수업 중</span>
            {pendingCalls.length > 0 && (
              <span className="bg-brand-red text-black px-2 py-0.5 rounded-full text-[10px]">
                대기 중인 알림 {pendingCalls.length}건
              </span>
            )}
          </div>
        </div>
      )}
`;

content = content.replace(
  '<button \n        onClick={() => setShowSettingsModal(true)}',
  badgeJSX + '\n      <button \n        onClick={() => setShowSettingsModal(true)}'
);

// 2. Change {!displayCall ? (  to {!activeAlert ? (
content = content.replace(
  "{!displayCall ? (",
  "{!activeAlert ? ("
);

// 3. Change all occurrences of `state.studentName`, `state.message`, etc. inside the activeAlert modal to `activeAlert.studentName`
// To do this safely, we will only replace inside the "calling" div.
const callingDivStart = content.indexOf('key="calling"');
if (callingDivStart !== -1) {
  const beforeCalling = content.substring(0, callingDivStart);
  let afterCalling = content.substring(callingDivStart);
  afterCalling = afterCalling.replace(/state\.studentName/g, "activeAlert.studentName");
  afterCalling = afterCalling.replace(/state\.message/g, "activeAlert.message");
  afterCalling = afterCalling.replace(/state\.teacherName/g, "activeAlert.teacherName");
  afterCalling = afterCalling.replace(/state\.location/g, "activeAlert.location");
  content = beforeCalling + afterCalling;
}

fs.writeFileSync('src/components/ClassroomDisplay.tsx', content);
