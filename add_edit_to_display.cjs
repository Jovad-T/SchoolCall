const fs = require('fs');
let content = fs.readFileSync('src/components/ClassroomDisplay.tsx', 'utf8');

// We need to add the updateAnnouncement from the hook
content = content.replace(
  "const { announcement } = useClassAnnouncement(settings?.grade || '', settings?.classNm || '');",
  "const { announcement, updateAnnouncement } = useClassAnnouncement(settings?.grade || '', settings?.classNm || '');\n  const [isEditingAnnounce, setIsEditingAnnounce] = useState(false);\n  const [editAnnounceText, setEditAnnounceText] = useState('');"
);

const oldAnnounceBlock = `
                  <div className="glass-card p-6 md:p-10 rounded-2xl border-t-4 border-t-brand-red min-h-[160px] flex items-center justify-center relative">
                    {announcement ? (
                      <p className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-relaxed whitespace-pre-wrap text-center w-full">
                        {announcement}
                      </p>
                    ) : (
                      <p className="text-xl md:text-2xl font-semibold tracking-tight text-[#555] text-center w-full">
                        오늘 등록된 전달사항이 없습니다.
                      </p>
                    )}
                  </div>
`;

const newAnnounceBlock = `
                  <div 
                    className="glass-card p-6 md:p-10 rounded-2xl border-t-4 border-t-brand-red min-h-[160px] flex items-center justify-center relative group cursor-pointer"
                    onClick={() => {
                      if (!isEditingAnnounce) {
                        setEditAnnounceText(announcement || '');
                        setIsEditingAnnounce(true);
                      }
                    }}
                  >
                    {!isEditingAnnounce && (
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs text-brand-red font-bold bg-[#111] px-3 py-1 rounded-full border border-brand-red/30">클릭하여 수정</span>
                      </div>
                    )}
                    
                    {isEditingAnnounce ? (
                      <div className="w-full flex flex-col gap-3">
                        <textarea
                          autoFocus
                          value={editAnnounceText}
                          onChange={e => setEditAnnounceText(e.target.value)}
                          className="w-full bg-[#0A0A0C] p-4 rounded-xl border border-brand-red text-2xl md:text-3xl font-bold tracking-tight text-white leading-relaxed focus:outline-none resize-none min-h-[120px]"
                          placeholder="전달사항을 입력하세요..."
                        />
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setIsEditingAnnounce(false); }}
                            className="px-4 py-2 bg-[#222] text-[#888] rounded-lg font-bold text-sm hover:bg-[#333]"
                          >
                            취소
                          </button>
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              updateAnnouncement(editAnnounceText);
                              setIsEditingAnnounce(false); 
                            }}
                            className="px-4 py-2 bg-brand-red text-black rounded-lg font-bold text-sm hover:brightness-110"
                          >
                            저장
                          </button>
                        </div>
                      </div>
                    ) : announcement ? (
                      <p className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-relaxed whitespace-pre-wrap text-center w-full">
                        {announcement}
                      </p>
                    ) : (
                      <p className="text-xl md:text-2xl font-semibold tracking-tight text-[#555] text-center w-full">
                        오늘 등록된 전달사항이 없습니다. (클릭하여 입력)
                      </p>
                    )}
                  </div>
`;

content = content.replace(oldAnnounceBlock.trim(), newAnnounceBlock.trim());
fs.writeFileSync('src/components/ClassroomDisplay.tsx', content);
