const fs = require('fs');

let content = fs.readFileSync('src/components/ClassroomDisplay.tsx', 'utf8');

// Imports:
if (!content.includes('import { ref, onValue } from')) {
    content = content.replace("import { useState, useEffect } from 'react';", "import { useState, useEffect } from 'react';\nimport { ref, onValue } from 'firebase/database';\nimport { db } from '../lib/firebase';");
}

const stateToAdd = `
  const [schedule, setSchedule] = useState<{period: number; start: string; end: string}[]>([]);
  const [displayCall, setDisplayCall] = useState(false);

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

  const isClassTime = () => {
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTotal = currentHours * 60 + currentMinutes;

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

  useEffect(() => {
    if (state.callStatus) {
      if (isClassTime()) {
        console.log("수업 중이라 알림이 차단되었습니다");
        setDisplayCall(false);
      } else {
        setDisplayCall(true);
      }
    } else {
      setDisplayCall(false);
    }
  }, [state.callStatus, schedule]);
`;

content = content.replace(
  "const [neisError, setNeisError] = useState(false);",
  "const [neisError, setNeisError] = useState(false);\n" + stateToAdd
);

content = content.replace(
  "{!state.callStatus ? (",
  "{!displayCall ? ("
);

fs.writeFileSync('src/components/ClassroomDisplay.tsx', content);
