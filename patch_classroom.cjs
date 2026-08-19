const fs = require('fs');
let code = fs.readFileSync('src/components/ClassroomDisplay.tsx', 'utf8');

// Remove socket
code = code.replace(/import\s*\{\s*io\s*\}\s*from\s*['"]socket\.io-client['"];\n?/g, '');
code = code.replace(/const\s+socket\s*=\s*io\([^)]*\);\n?/g, '');
code = code.replace(/socket\.on\([^)]*\);/g, '');
code = code.replace(/socket\.disconnect\(\);/g, '');

// update useClassAnnouncement
code = code.replace(
  "const { announcement, updateAnnouncement } = useClassAnnouncement(grade, classNm);",
  "const { announcement, updateAnnouncement, lastUpdatedAt } = useClassAnnouncement(grade, classNm);"
);

// We need to inject the popup logic again. The previous one might have been wiped or left in a bad state.
// Let's first clean up any existing trigger-my-call logic in useEffects.
// It's easier to just do string matching and replacement if we know what's there. Let's see what's currently in `ClassroomDisplay.tsx` for electron popup.
