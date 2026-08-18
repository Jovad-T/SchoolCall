const fs = require('fs');
let adminContent = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// We need to rewrite parseAndSaveStudents to group data and save to Firebase
const newParser = `
  const parseAndSaveStudents = async (text: string) => {
    try {
      const lines = text.split('\\n');
      const groupedData: Record<string, Record<string, string[]>> = {};
      let studentCount = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (!trimmed) continue;
        
        const cleanLine = trimmed.replace(/["']/g, '');
        const parts = cleanLine.split(',').map(p => p.trim());
        
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
          if (id.length >= 4) {
            const g = id[0];
            let c = id.substring(1, id.length - 2);
            if (c.startsWith('0')) c = c.substring(1);
            const num = parseInt(id.slice(-2));
            
            if (!groupedData[g]) groupedData[g] = {};
            if (!groupedData[g][c]) groupedData[g][c] = [];
            
            groupedData[g][c].push(\`\${num}번 \${name}\`);
            studentCount++;
          }
        }
      }
      
      if (studentCount > 0 && db) {
        // Sort arrays before saving
        for (const g in groupedData) {
          for (const c in groupedData[g]) {
            groupedData[g][c].sort((a, b) => parseInt(a) - parseInt(b));
          }
        }
        
        await set(ref(db, 'school_data/students'), groupedData);
        setUploadStatus(\`✅ 총 \${studentCount}명의 학생 명단이 서버(Firebase)에 성공적으로 등록되었습니다.\`);
        setTimeout(() => setUploadStatus(null), 5000);
      } else if (!db) {
        alert("Firebase가 연결되어 있지 않아 서버에 저장할 수 없습니다.");
      } else {
        alert("유효한 데이터가 없습니다. 예시: '학번,이름'");
      }
    } catch (err) {
      console.error(err);
      alert("데이터 처리 중 오류가 발생했습니다.");
    }
  };
`;

adminContent = adminContent.replace(/const parseAndSaveStudents = \(text: string\) => \{[\s\S]*?catch \(err\) \{[\s\S]*?alert\("데이터 처리 중 오류가 발생했습니다\."\);\n    \}\n  \};/, newParser.trim());
fs.writeFileSync('src/components/AdminDashboard.tsx', adminContent);
