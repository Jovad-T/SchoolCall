import React, { useState, useEffect } from 'react';
import { Bell, Clock, Settings, X, Calendar, Utensils, BookOpen, Volume2, ShieldAlert, LogOut } from 'lucide-react';

export default function NotificationBoardApp() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 실시간 시계 업데이트
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 날짜 포맷팅
  const dateString = `${currentTime.getMonth() + 1}월 ${currentTime.getDate()}일 ${['일', '월', '화', '수', '목', '금', '토'][currentTime.getDay()]}요일`;
  const timeString = currentTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  // 앱 종료/나가기 핸들러
  const handleExitApp = () => {
    if ((window as any).electronAPI) {
      (window as any).electronAPI.closeNotification();
    } else {
      if (window.confirm("알림판 화면을 종료하시겠습니까?")) {
        window.close();
      }
    }
  };

  return (
    <div className="h-screen w-full bg-[#1e382b] text-white font-sans flex flex-col select-none overflow-hidden relative shadow-2xl border-4 border-[#2b4c3b]">
      
      {/* 상단 헤더 영역 */}
      <header className="h-20 px-8 flex items-center justify-between border-b border-emerald-900/60 bg-[#162d22]/60 shrink-0">
        <div className="flex flex-col">
          <span className="text-xs text-emerald-400 font-medium tracking-wider">실시간 학급 대시보드</span>
          <h1 className="text-2xl font-black tracking-tight text-white drop-shadow-md">2학년 8반 알림판</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-3xl font-black tracking-widest text-emerald-100 font-mono">{timeString}</div>
            <div className="text-xs text-emerald-400 font-semibold">{dateString}</div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-800 text-emerald-200 hover:text-white transition-colors border border-emerald-700/50 shadow-inner cursor-pointer"
              title="설정"
            >
              <Settings size={22} />
            </button>
            <button 
              onClick={handleExitApp}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 hover:text-white transition-colors border border-rose-800/60 shadow-inner text-xs font-bold cursor-pointer"
              title="나가기"
            >
              <LogOut size={18} />
              나가기
            </button>
          </div>
        </div>
      </header>

      {/* 메인 대시보드 콘텐츠 */}
      <main className="flex-1 p-8 grid grid-cols-12 gap-8 overflow-hidden">
        
        {/* 좌측: 오늘의 시간표 */}
        <section className="col-span-7 flex flex-col bg-[#162d22]/40 rounded-3xl p-6 border border-emerald-900/40 shadow-sm h-full">
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <BookOpen size={20} className="text-emerald-400" />
            <h2 className="text-base font-bold text-emerald-200">오늘의 시간표</h2>
          </div>
          
          <div className="grid grid-cols-3 gap-5 flex-1 min-h-0 pb-2">
            {[
              { period: '1교시', subject: '영어 II', color: 'bg-[#fff9c4] text-slate-900 rotate-[-0.8deg]' },
              { period: '2교시', subject: '미술감상과비평', color: 'bg-[#fce4ec] text-slate-900 rotate-[0.8deg]' },
              { period: '3교시', subject: '프랑스어회화', color: 'bg-[#e3f2fd] text-slate-900 rotate-[-0.5deg]' },
              { period: '4교시', subject: '음악과미디어', color: 'bg-[#e8f5e9] text-slate-900 rotate-[0.6deg]' },
              { period: '5교시', subject: '역학과에너지', color: 'bg-[#fff3e0] text-slate-900 rotate-[-1.0deg]' },
              { period: '6교시', subject: '세모와물질대사', color: 'bg-[#f3e5f5] text-slate-900 rotate-[1.2deg]' }
            ].map((item, idx) => (
              <div key={idx} className={`${item.color} rounded-2xl p-4 flex flex-col justify-between shadow-xl font-handwriting transition-transform hover:scale-105 duration-200 relative border border-black/5 h-full`}>
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-12 h-4 bg-amber-200/60 rotate-1 shadow-sm border border-amber-300/40"></div>
                <span className="text-xs font-bold opacity-60 font-sans mt-1">{item.period}</span>
                <span className="text-xl font-black text-center my-auto break-keep">{item.subject}</span>
                <div className="w-2.5 h-2.5 bg-rose-500/80 rounded-full mx-auto shadow-sm mt-1"></div>
              </div>
            ))}
          </div>
        </section>

        {/* 우측: 오늘의 급식 (상하 공간 꽉 채우고 글자 크기 대폭 확대) */}
        <section className="col-span-5 flex flex-col bg-[#162d22]/40 rounded-3xl p-6 border border-emerald-900/40 shadow-sm h-full">
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <Utensils size={20} className="text-emerald-400" />
            <h2 className="text-base font-bold text-emerald-200">오늘의 급식</h2>
          </div>

          <div className="grid grid-cols-2 gap-5 flex-1 min-h-0 pb-2">
            {/* 점심 칸 */}
            <div className="bg-[#11231b]/90 rounded-2xl p-6 border border-emerald-800/50 flex flex-col justify-between text-center shadow-inner h-full">
              <span className="text-sm font-bold text-amber-300 bg-amber-950/80 px-4 py-2 rounded-full mx-auto shadow-sm border border-amber-800/40 shrink-0">🍴 점심 식단</span>
              <ul className="text-lg font-bold text-emerald-100 space-y-2.5 leading-snug my-auto">
                <li>백미밥</li>
                <li>투움바파스타</li>
                <li>근대된장국</li>
                <li>자메이카닭다리살스테이크</li>
                <li>배추김치</li>
              </ul>
              <div className="text-xs text-emerald-400/70 font-mono tracking-widest shrink-0">LUNCH MENU</div>
            </div>

            {/* 저녁 칸 */}
            <div className="bg-[#11231b]/90 rounded-2xl p-6 border border-emerald-800/50 flex flex-col justify-between text-center shadow-inner h-full">
              <span className="text-sm font-bold text-indigo-300 bg-indigo-950/80 px-4 py-2 rounded-full mx-auto shadow-sm border border-indigo-800/40 shrink-0">🌙 저녁 식단</span>
              <ul className="text-lg font-bold text-emerald-100 space-y-2.5 leading-snug my-auto">
                <li>백미밥</li>
                <li>홍합무국</li>
                <li>온두부숙회</li>
                <li>느타리버섯무침</li>
                <li>불맛제육볶음</li>
              </ul>
              <div className="text-xs text-emerald-400/70 font-mono tracking-widest shrink-0">DINNER MENU</div>
            </div>
          </div>
        </section>

      </main>

      {/* 설정 모달 */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 text-slate-900">
            <div className="flex items-center justify-between mb-4 border-b pb-3">
              <h3 className="font-bold text-lg flex items-center gap-2"><Settings size={18} /> 알림판 환경설정</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>
            <div className="space-y-4 text-sm text-slate-600">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border">
                <span>컴퓨터 부팅 시 자동 실행</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">활성화됨</span>
              </div>
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border">
                <span>시스템 트레이 백그라운드 상주</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">연동 대기 중</span>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setIsSettingsOpen(false)} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs cursor-pointer">확인</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}