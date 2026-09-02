import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_close = """            <div className="flex flex-col items-center gap-4 w-full mt-8">
              <button 
                onClick={handleClosePopupAndHide}
                className="px-12 py-5 bg-[#ff0055] hover:bg-[#ff3377] text-white font-black rounded-2xl shadow-[0_0_20px_#ff0055] transition-all text-xl flex items-center gap-3 cursor-pointer active:scale-95"
              >
                <X size={28} strokeWidth={3} />
                확인 (닫기)
              </button>
            </div>
          
          </div>
        </div>
      )}
    </div>
  );
}"""

new_close = """            <div className="flex flex-col items-center gap-4 w-full mt-8">
              <button 
                onClick={handleClosePopupAndHide}
                className="px-12 py-5 bg-[#ff0055] hover:bg-[#ff3377] text-white font-black rounded-2xl shadow-[0_0_20px_#ff0055] transition-all text-xl flex items-center gap-3 cursor-pointer active:scale-95"
              >
                <X size={28} strokeWidth={3} />
                확인 (닫기)
              </button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}"""

if old_close in content:
    content = content.replace(old_close, new_close)
else:
    print("old_close not found")

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)
