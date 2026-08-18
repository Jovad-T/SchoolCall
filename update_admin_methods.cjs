const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// 1. Add state for manual entry
content = content.replace(
  "const [isUploading, setIsUploading] = useState(false);",
  "const [isUploading, setIsUploading] = useState(false);\n  const [manualCsvText, setManualCsvText] = useState('');"
);

// 2. Add the shared parser and manual submit handler
const sharedParser = `
  const parseAndSaveStudents = (text: string) => {
    try {
      const lines = text.split('\\n');
      const parsedStudents = [];
      let studentCount = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (!trimmed) continue;
        
        const cleanLine = trimmed.replace(/["']/g, '');
        const parts = cleanLine.split(',');
        
        if (parts.length >= 2) {
          const id = parts[0].trim();
          const name = parts[1].trim();
          
          if (id && name && !isNaN(Number(id))) {
            parsedStudents.push({ id, name });
            studentCount++;
          }
        }
      }
      
      if (parsedStudents.length > 0) {
        setGlobalStudents(parsedStudents);
        setUploadStatus(\`✅ 총 \${studentCount}명의 학생 명단이 성공적으로 등록되었습니다.\`);
        setTimeout(() => setUploadStatus(null), 5000);
      } else {
        alert("유효한 CSV 데이터가 없습니다. 예시: '학번,이름'");
      }
    } catch (err) {
      console.error(err);
      alert("데이터 처리 중 오류가 발생했습니다.");
    }
  };

  const handleManualSubmit = () => {
    if (!manualCsvText.trim()) {
      alert('등록할 텍스트를 입력해 주세요.');
      return;
    }
    parseAndSaveStudents(manualCsvText);
    setManualCsvText('');
  };
`;

content = content.replace(
  "const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {",
  sharedParser + "\n  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {"
);

// 3. Update handleFileUpload to use the shared parser
const newHandleFileUpload = `  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        parseAndSaveStudents(event.target.result as string);
      }
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };`;

content = content.replace(/const handleFileUpload = \([\s\S]*?reader\.readAsText\(file\);\n  };/, newHandleFileUpload);

// 4. Replace the UI block for the student upload section
const oldUIBlockRegex = /<div className="glass-card p-10 rounded-2xl border border-brand-red\/30 flex flex-col items-center justify-center">[\s\S]*?\{uploadStatus\}\n            <\/div>\n          \)\}?\n        <\/div>/;

const newUIBlock = `        <div className="glass-card p-10 rounded-2xl border border-brand-red/30 flex flex-col w-full">
          <div className="flex items-center gap-3 mb-6 w-full justify-center">
            <Upload className="w-6 h-6 text-brand-red" />
            <h2 className="text-xl font-bold tracking-widest text-white">학생 명단 등록</h2>
          </div>
          
          <p className="text-[#888] text-xs tracking-wider mb-8 text-center leading-relaxed">
            💡 학번, 이름 순서로 작성된 데이터를 업로드하거나 직접 텍스트로 입력해 주세요.<br/>
            (첫 줄에 헤더(학번,이름)가 있거나 없어도 모두 자동 인식합니다)
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {/* Method 1: File Upload */}
            <div className="flex flex-col items-center p-6 bg-[#111] rounded-xl border border-[#333]">
              <h3 className="text-sm font-bold text-white mb-4">방법 1. CSV 파일 업로드</h3>
              <p className="text-[#666] text-[10px] mb-6 text-center leading-tight">
                엑셀 파일 등을 CSV로 저장한 후 업로드하세요.
              </p>
              <div className="relative mt-auto">
                <input 
                  type="file" 
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                />
                <button className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-red/20 text-brand-red border border-brand-red/50 rounded-lg font-bold text-xs tracking-widest hover:bg-brand-red hover:text-black transition-all disabled:opacity-50">
                  <Upload className="w-4 h-4" />
                  파일 선택
                </button>
              </div>
            </div>

            {/* Method 2: Manual Text Input */}
            <div className="flex flex-col items-center p-6 bg-[#111] rounded-xl border border-[#333]">
              <h3 className="text-sm font-bold text-white mb-4">방법 2. 텍스트 직접 입력</h3>
              <textarea 
                value={manualCsvText}
                onChange={e => setManualCsvText(e.target.value)}
                placeholder="20801,구효진&#10;20802,김학생"
                className="w-full h-24 bg-[#1A1A1C] p-3 rounded-lg border border-[#444] text-[#DDD] text-xs outline-none focus:border-brand-red resize-none mb-4 font-mono leading-relaxed"
              />
              <button 
                onClick={handleManualSubmit}
                className="w-full py-3 bg-brand-red/20 text-brand-red border border-brand-red/50 hover:bg-brand-red hover:text-black font-bold text-xs rounded-lg transition-colors"
              >
                ✏️ 입력한 텍스트로 등록
              </button>
            </div>
          </div>
          
          {uploadStatus && (
            <div className="mt-8 text-center px-4 py-4 bg-[#1A1A1C] border border-brand-green/30 text-brand-green text-sm rounded-lg shadow-lg">
              {uploadStatus}
            </div>
          )}
        </div>`;

content = content.replace(oldUIBlockRegex, newUIBlock);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
