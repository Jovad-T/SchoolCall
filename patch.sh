sed -i.bak -e '/<\/main>/r /dev/stdin' src/App.tsx << 'INNER_EOF'

      {viewMode === '\''classroom'\'' && pendingAnnouncements.length > 0 && (
        <div 
          className="absolute bottom-6 left-6 w-80 bg-[#162d22]/95 backdrop-blur-md border border-emerald-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-40 animate-fade-in"
          style={{ WebkitAppRegion: '\''no-drag'\'' } as any}
        >
          <div className="bg-emerald-900/80 px-4 py-3 border-b border-emerald-500/30 flex items-center justify-between">
            <h3 className="text-sm font-bold text-emerald-100 flex items-center gap-2 drop-shadow">
              <Clock size={16} className="text-amber-300" /> 예약된 알림 대기열
            </h3>
            <span className="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-black animate-pulse shadow">{pendingAnnouncements.length}</span>
          </div>
          <div className="max-h-56 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {pendingAnnouncements.map((ann) => (
              <div key={ann.id} className="bg-black/30 rounded-xl p-3 border border-emerald-900/60 flex flex-col gap-2 relative">
                <p className="text-xs text-emerald-100 line-clamp-2 font-medium leading-relaxed">{ann.text}</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[10px] text-emerald-400/80 font-mono">
                    {new Date(ann.time).toLocaleTimeString('\''ko-KR'\'', { hour: '\''2-digit'\'', minute: '\''2-digit'\'' })} 예약됨
                  </span>
                  <button 
                    onClick={() => setPendingAnnouncements(prev => prev.filter(a => a.id !== ann.id))}
                    className="text-[10px] bg-rose-900/50 hover:bg-rose-800 text-rose-200 px-2.5 py-1 rounded-md border border-rose-800/60 transition-colors font-bold shadow-inner cursor-pointer"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 bg-black/40 border-t border-emerald-900/60">
            <button 
              onClick={() => {
                const next = pendingAnnouncements[0];
                setPendingAnnouncements(prev => prev.slice(1));
                setAnnouncement(next.text);
                setIsPopupOpen(true);
                setIsExited(false);
                playNeonAlertSound();
                speakAnnouncementText(next.text);
              }}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors shadow-md border border-emerald-500 cursor-pointer"
            >
              지금 바로 띄우기 (즉시 실행)
            </button>
          </div>
        </div>
      )}
INNER_EOF
