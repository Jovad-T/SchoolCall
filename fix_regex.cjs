const fs = require('fs');
let c = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

c = c.replace(/const parts = value\.split\(\/\[\/\]\/\);\n\s*\]\/\);/g, 'const parts = value.split(/[\\\\/\\\\n]/);');
c = c.replace(/const parts = value\.split\(\/\[\/\n  \]\/\);/g, 'const parts = value.split(/[\\\\/\\\\n]/);');
c = c.replace('const parts = value.split(/[/\\n  ]/);', 'const parts = value.split(/[\\\\/\\\\n]/);');

fs.writeFileSync('src/components/AdminDashboard.tsx', c);
