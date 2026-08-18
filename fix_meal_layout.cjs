const fs = require('fs');
let content = fs.readFileSync('src/components/ClassroomDisplay.tsx', 'utf8');

content = content.replace(
  '<div className="grid grid-rows-2 gap-4 h-full">',
  '<div className="grid grid-cols-2 gap-4 h-full">'
);

fs.writeFileSync('src/components/ClassroomDisplay.tsx', content);
