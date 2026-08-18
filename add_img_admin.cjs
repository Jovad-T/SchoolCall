const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// Imports
content = content.replace(
  "useSchoolStructure, useClassTimetable } from '../lib/store';",
  "useSchoolStructure, useClassTimetable, useClassTimetableImage } from '../lib/store';"
);
content = content.replace(
  "import { Upload, Home, Clock, School, Calendar } from 'lucide-react';",
  "import { Upload, Home, Clock, School, Calendar, Image as ImageIcon, Trash2 } from 'lucide-react';"
);

// Hooks for Image
const hookInjection = `
  const { customTimetable, updateCustomTimetable } = useClassTimetable(ttGrade, ttClassNm);
  const { timetableImage, updateTimetableImage } = useClassTimetableImage(ttGrade, ttClassNm);
  const [imageFile, setImageFile] = useState<string | null>(null);
  
  useEffect(() => {
    setImageFile(timetableImage || null);
  }, [timetableImage, ttGrade, ttClassNm]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("이미지 크기는 2MB 이하여야 합니다.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageFile(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveImageTimetable = async () => {
    await updateTimetableImage(imageFile);
    setTtStatus("✅ 시간표 이미지가 저장되었습니다.");
    setTimeout(() => setTtStatus(null), 3000);
  };
`;

content = content.replace(
  "const { customTimetable, updateCustomTimetable } = useClassTimetable(ttGrade, ttClassNm);",
  hookInjection
);

// UI for Image Upload
const uiInjection = `
          <div className="w-full max-w-md bg-[#111] p-6 rounded-xl border border-[#333] mb-8">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-brand-green" /> 
              시간표 이미지 등록 (우선 적용)
            </h3>
            <p className="text-[#888] text-[10px] mb-4">
              이미지를 등록하면 아래의 텍스트 시간표나 나이스(NEIS) 시간표 대신 이미지가 교실에 출력됩니다.
            </p>
            
            <div className="flex flex-col gap-4">
              {imageFile ? (
                <div className="relative w-full aspect-video bg-black rounded-lg border border-[#444] overflow-hidden group">
                  <img src={imageFile} alt="시간표 미리보기" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <button 
                      onClick={() => setImageFile(null)}
                      className="flex items-center gap-2 bg-brand-red text-black px-4 py-2 rounded-lg font-bold text-xs"
                    >
                      <Trash2 className="w-4 h-4" />
                      삭제하기
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-32 border-2 border-dashed border-[#444] rounded-lg hover:border-brand-green transition-colors flex flex-col items-center justify-center cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <ImageIcon className="w-8 h-8 text-[#555] mb-2" />
                  <span className="text-[#888] text-xs font-bold">클릭하여 이미지 파일 선택</span>
                </div>
              )}
              
              <button 
                onClick={handleSaveImageTimetable}
                className="w-full bg-[#1A1A1C] text-brand-green border border-brand-green/50 py-3 rounded-lg font-bold text-xs tracking-widest hover:bg-brand-green hover:text-black transition-colors mt-2"
              >
                이미지 설정 저장/적용
              </button>
            </div>
          </div>

          <div className="w-full overflow-x-auto custom-scrollbar">
`;

content = content.replace(
  `<div className="w-full overflow-x-auto custom-scrollbar">`,
  uiInjection
);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
