const fs = require('fs');
let code = fs.readFileSync('src/components/OfficeRemote.tsx', 'utf8');

// Ensure firebase imports
if (!code.includes("import { ref, update, set }")) {
  code = code.replace(
    "import { db } from '../lib/firebase';",
    "import { db } from '../lib/firebase';\nimport { ref, update, set } from 'firebase/database';"
  );
}

// Remove socket
code = code.replace(/import\s*\{\s*io\s*\}\s*from\s*['"]socket\.io-client['"];\n?/g, '');
code = code.replace(/const\s+socket\s*=\s*io\([^)]*\);\n?/g, '');
code = code.replace(/socket\.emit\([^)]*\);\n?/g, '');

const handleCallRegex = /const handleCall = \(\) => \{[\s\S]*?updateState\(`\$\{grade\}-\$\{classNm\}`,\s*payload\);\n\s*\};/;
const newHandleCall = `const handleCall = () => {
    if (!grade || !classNm || !selectedStudent || !selectedMessage || !location || !teacherName) {
      alert("모든 필드를 입력해 주세요.");
      return;
    }

    const payload = {
      studentName: selectedStudent,
      message: selectedMessage,
      location,
      teacherName,
      timestamp: Date.now()
    };
    
    setIsCalling(true);
    // write to Firebase RTDB
    const callRef = ref(db, \`classes/\${grade}-\${classNm}/callState\`);
    update(callRef, payload).then(() => {
      updateState(\`\${grade}-\${classNm}\`, payload);
    }).catch(console.error);
  };`;
code = code.replace(handleCallRegex, newHandleCall);

const handleEndCallRegex = /const handleEndCall = \(\) => \{[\s\S]*?updateState\(`\$\{grade\}-\$\{classNm\}`,\s*null\);\n\s*\};/;
const newHandleEndCall = `const handleEndCall = () => {
    setIsCalling(false);
    setSelectedStudent('');
    
    const callRef = ref(db, \`classes/\${grade}-\${classNm}/callState\`);
    update(callRef, { studentName: null, message: null, location: null, teacherName: null }).then(() => {
      updateState(\`\${grade}-\${classNm}\`, null);
    }).catch(console.error);
  };`;
code = code.replace(handleEndCallRegex, newHandleEndCall);

fs.writeFileSync('src/components/OfficeRemote.tsx', code);
