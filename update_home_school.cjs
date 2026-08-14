const fs = require('fs');
let content = fs.readFileSync('src/components/Home.tsx', 'utf8');

if (!content.includes('import { useState, useEffect }')) {
  content = content.replace("import { useNavigate }", "import React, { useState, useEffect } from 'react';\nimport { ref, onValue } from 'firebase/database';\nimport { db } from '../lib/firebase';\nimport { useNavigate }");
}

const stateHook = `
  const [schoolName, setSchoolName] = useState<string>('우리 학교');

  useEffect(() => {
    if (!db) return;
    const nameRef = ref(db, 'school_data/school_name');
    const nameUnsub = onValue(nameRef, (snapshot) => {
      if (snapshot.exists() && snapshot.val()) {
        setSchoolName(snapshot.val());
      } else {
        setSchoolName('우리 학교');
      }
    });
    return () => nameUnsub();
  }, []);
`;

content = content.replace(
  "const { isFirebaseConnected } = useCallState('default');",
  "const { isFirebaseConnected } = useCallState('default');\n" + stateHook
);

content = content.replace(
  '<h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white">',
  '<h2 className="text-brand-green uppercase tracking-[0.2em] text-sm font-bold mb-3">{schoolName}</h2>\n          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white">'
);

fs.writeFileSync('src/components/Home.tsx', content);
