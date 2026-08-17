const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// Update import to include setGlobalStudents
content = content.replace("import { db } from '../lib/firebase';", "import { db } from '../lib/firebase';\nimport { setGlobalStudents } from '../lib/store';");

// Replace handleFileUpload
const newHandleFileUpload = `  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\\n');
        
        const parsedStudents = [];
        let studentCount = 0;
        
        // 첫 번째 줄(헤더)은 무시하고, 두 번째 줄부터 파싱
        for (let i = 1; i < lines.length; i++) {
          const trimmed = lines[i].trim();
          if (!trimmed) continue;
          
          // 따옴표 제거 및 쉼표 분리
          const cleanLine = trimmed.replace(/["']/g, '');
          const parts = cleanLine.split(',');
          
          if (parts.length >= 2) {
            const id = parts[0].trim();
            const name = parts[1].trim();
            
            if (id && name) {
              parsedStudents.push({ id, name });
              studentCount++;
            }
          }
        }
        
        if (parsedStudents.length > 0) {
          setGlobalStudents(parsedStudents); // 전역 상태 및 localStorage 반영
          setUploadStatus(\`✅ 총 \${studentCount}명의 학생 명단이 성공적으로 등록되었습니다.\`);
        } else {
          alert("유효한 CSV 데이터가 없습니다. 예시: '학번,이름'");
        }
      } catch (err) {
        console.error(err);
        alert("파일 처리 중 오류가 발생했습니다.");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };`;

content = content.replace(/const handleFileUpload = \([\s\S]*?reader\.readAsText\(file\);\n  };/, newHandleFileUpload);

// Replace UI for upload
const uploadUI = `        <div className="glass-card p-10 rounded-2xl border border-brand-red/30 flex flex-col items-center justify-center">
          <div className="flex items-center gap-3 mb-6 w-full justify-center">
            <Upload className="w-6 h-6 text-brand-red" />
            <h2 className="text-xl font-bold tracking-widest text-white">학생 명단 업로드</h2>
          </div>
          
          <p className="text-[#888] text-xs tracking-wider mb-6 text-center leading-relaxed">
            💡 학번, 이름 순서로 작성된 CSV 파일을 업로드해 주세요.<br/>
            <span className="text-[#555] font-mono text-[10px] bg-black/50 px-2 py-1 rounded mt-2 inline-block">
              예시:<br/>
              학번,이름<br/>
              20801,구효진<br/>
              20802,김학생
            </span>
          </p>
          
          <div className="relative">
            <input 
              type="file" 
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileUpload}
              disabled={isUploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
            />
            <button className="flex items-center gap-2 px-8 py-4 bg-brand-red text-black rounded-xl font-black text-sm tracking-widest hover:brightness-110 transition-all shadow-[0_0_15px_rgba(255,62,62,0.3)] disabled:opacity-50">
              <Upload className="w-5 h-5" />
              📄 CSV 명단 일괄 업로드
            </button>
          </div>
          
          {uploadStatus && (
            <div className="mt-6 text-center px-4 py-4 bg-[#1A1A1C] border border-brand-green/30 text-brand-green text-sm rounded-lg shadow-lg">
              {uploadStatus}
            </div>
          )}
        </div>`;

content = content.replace(/<div className="glass-card p-10 rounded-2xl border border-brand-red\/30 flex flex-col items-center justify-center">[\s\S]*?\{uploadStatus\}\n            <\/div>\n          \)\}?\n        <\/div>/, uploadUI);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
