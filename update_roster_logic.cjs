const fs = require('fs');
let content = fs.readFileSync('src/lib/store.ts', 'utf8');

const updatedUpdateLogic = `    const update = () => {
      const filtered = globalStudents.filter(s => {
        if (s.id.length >= 4) {
          const g = s.id[0];
          let c = s.id.substring(1, s.id.length - 2);
          if (c.startsWith('0')) c = c.substring(1);
          return g === grade && c === classNm;
        }
        return false;
      }).map(s => \`\${parseInt(s.id.slice(-2))}번 \${s.name}\`);
      
      setRoster(filtered);
    };`;

content = content.replace(/const update = \(\) => \{[\s\S]*?setRoster\(filtered\);\n    \};/, updatedUpdateLogic);
fs.writeFileSync('src/lib/store.ts', content);
