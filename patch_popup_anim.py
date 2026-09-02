import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_popup = """      {isPopupOpen && (
        <div 
          onClick={handleClosePopupAndHide} 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-fade-in cursor-pointer"
          title="클릭하거나 터치하면 팝업이 닫힙니다."
        >
          <div className="relative w-full max-w-4xl bg-[#050505] border-4 border-[#ff0055] rounded-3xl p-12 shadow-[0_0_80px_#ff0055,inset_0_0_40px_#ff0055] flex flex-col items-center text-center overflow-hidden" onClick={(e) => e.stopPropagation()}>"""

new_popup = """      <AnimatePresence>
        {isPopupOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClosePopupAndHide} 
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6 cursor-pointer"
            title="클릭하거나 터치하면 팝업이 닫힙니다."
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: -60 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 60 }}
              transition={{ type: "spring", damping: 15, stiffness: 200 }}
              className="relative w-full max-w-4xl bg-[#050505] border-4 border-[#ff0055] rounded-3xl p-12 shadow-[0_0_80px_#ff0055,inset_0_0_40px_#ff0055] flex flex-col items-center text-center overflow-hidden" 
              onClick={(e: any) => e.stopPropagation()}
            >"""

if old_popup in content:
    content = content.replace(old_popup, new_popup)
else:
    print("old_popup not found")

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
}

export default App;"""

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
}

export default App;"""

if old_close in content:
    content = content.replace(old_close, new_close)
else:
    print("old_close not found")

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)
