const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const oldParser = `
        if (parts.length >= 2) {
          const id = parts[0].trim();
          const name = parts[1].trim();
          
          if (id && name && !isNaN(Number(id))) {
            parsedStudents.push({ id, name });
            studentCount++;
          }
        }
`;

const newParser = `
        let id = '';
        let name = '';

        // 4열 형식 (학년, 반, 번호, 성명)
        if (parts.length >= 4 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1])) && !isNaN(Number(parts[2]))) {
          const g = parts[0];
          const c = parts[1];
          const num = parts[2];
          name = parts[3];
          id = \`\${g}\${c.padStart(2, '0')}\${num.padStart(2, '0')}\`;
        } 
        // 2열 형식 (학번, 성명)
        else if (parts.length >= 2) {
          id = parts[0];
          name = parts[1];
        }
        
        if (id && name && !isNaN(Number(id))) {
          parsedStudents.push({ id, name });
          studentCount++;
        }
`;

// Also, need to replace parts processing line to trim each part
content = content.replace(
  "const parts = cleanLine.split(',');",
  "const parts = cleanLine.split(',').map(p => p.trim());"
);

content = content.replace(
  /if \(parts\.length >= 2\) \{[\s\S]*?\}[\s\S]*?\}/,
  newParser.trim()
);

// Update UI hint
const oldUIHint = `💡 학번, 이름 순서로 작성된 데이터를 업로드하거나 직접 텍스트로 입력해 주세요.<br/>
            (첫 줄에 헤더(학번,이름)가 있거나 없어도 모두 자동 인식합니다)`;

const newUIHint = `💡 학번, 성명 또는 학년, 반, 번호, 성명 순서로 작성된 데이터를 업로드하거나 입력해 주세요.<br/>
            (헤더가 있거나 없어도 모두 자동 인식합니다)`;

content = content.replace(oldUIHint, newUIHint);

const oldPlaceholder = 'placeholder="20801,구효진&#10;20802,김학생"';
const newPlaceholder = 'placeholder="[형식 1] 20801,구효진&#10;[형식 2] 2,8,1,김학생"';
content = content.replace(oldPlaceholder, newPlaceholder);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
