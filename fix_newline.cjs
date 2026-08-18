const fs = require('fs');
let content = fs.readFileSync('src/components/OfficeRemote.tsx', 'utf8');

content = content.replace("useState<string>(state.location || '교무실');\\n", "useState<string>(state.location || '교무실');\n");

fs.writeFileSync('src/components/OfficeRemote.tsx', content);
