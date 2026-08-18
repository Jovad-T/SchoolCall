const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const target = `
        if (id && name && !isNaN(Number(id))) {
          parsedStudents.push({ id, name });
          studentCount++;
        }
        }
      }
      
      if (parsedStudents.length > 0) {
`;

const replacement = `
        if (id && name && !isNaN(Number(id))) {
          parsedStudents.push({ id, name });
          studentCount++;
        }
      }
      
      if (parsedStudents.length > 0) {
`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/AdminDashboard.tsx', content);
