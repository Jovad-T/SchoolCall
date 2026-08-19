const fs = require('fs');

const file = 'src/components/ClassroomDisplay.tsx';
let code = fs.readFileSync(file, 'utf8');

// The file might still have socket.on leftover if the regex failed.
// Let's remove the whole useEffect containing socket.
code = code.replace(
  /useEffect\(\(\) => \{\s*const socket = io\(import\.meta\.env\.VITE_SERVER_URL \|\| window\.location\.origin\);\s*socket\.on\([^}]*\}[^}]*\}[^}]*\}[^}]*\}[^}]*\}[^}]*\}[^}]*\}[^}]*\}[^}]*\}[^]*return \(\) => \{\s*socket\.disconnect\(\);\s*\};\s*\}, \[grade, classNm\]\);/g,
  ""
);

// We should also remove the remaining socket logic if the regex was incorrect.
// Let's find any `const socket = io` and remove that block manually.
let lines = code.split('\\n');
let newLines = [];
let insideSocketEffect = false;

for (let i=0; i<lines.length; i++) {
  if (lines[i].includes('const socket = io(')) {
    // Found it! Wait, this is inside a useEffect
    // We should trace backwards to find useEffect(() => {
    // and forwards to find return () => { socket.disconnect(); }; }, [grade, classNm]);
    // It's easier to just do a string replace using indexOf
  }
}

