import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { MonitorPlay, Smartphone } from 'lucide-react';
import { useCallState } from '../lib/store';

export default function Home() {
  const navigate = useNavigate();
  const { isFirebaseConnected } = useCallState('default');

  const [schoolName, setSchoolName] = useState<string>('우리 학교');

  useEffect(() => {
    if (!db) return;
    const nameRef = ref(db, 'school_data/school_name');
    const nameUnsub = onValue(nameRef, (snapshot) => {
      if (snapshot.exists() && snapshot.val()) {
        setSchoolName(snapshot.val());
      } else {
        setSchoolName('우리 학교');
      }
    });
    return () => nameUnsub();
  }, []);


  return (
    <div className="min-h-screen bg-bg-dark grid-bg flex flex-col items-center justify-center p-6 text-[#E0E0E0] font-sans relative">
      <div className="max-w-3xl w-full text-center space-y-12 mt-10">
        <div className="space-y-4">
          <h2 className="text-brand-green uppercase tracking-[0.2em] text-sm font-bold mb-3">{schoolName}</h2>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white">
            학생 호출 시스템
          </h1>
          
          {!isFirebaseConnected && (
            <div className="mt-8 p-4 bg-bg-card border-l-4 border-l-brand-red text-[#AAA] text-xs font-mono text-left max-w-md mx-auto shadow-xl">
              <span className="text-brand-red font-bold">&gt; WARNING:</span> FIREBASE CONFIG EMPTY<br/>
              <span className="text-brand-green">&gt; FALLBACK:</span> LOCAL BROADCAST SYNC ACTIVE
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          {/* 교무실 모드 버튼 */}
          <button
            onClick={() => navigate('/office')}
            className="group relative flex flex-col items-center p-10 glass-card rounded-none hover:border-brand-red transition-all duration-300"
          >
            <div className="mb-6 opacity-70 group-hover:opacity-100 group-hover:text-brand-red transition-all">
              <Smartphone className="w-12 h-12" />
            </div>
            <h2 className="text-xl font-bold mb-2 tracking-widest">교무실 리모컨</h2>
            <p className="text-[#555] text-xs tracking-widest">관리자 / 호출 전송</p>
          </button>

          {/* 교실 모드 버튼 */}
          <button
            onClick={() => navigate('/class')}
            className="group relative flex flex-col items-center p-10 glass-card rounded-none hover:border-brand-green transition-all duration-300"
          >
            <div className="mb-6 opacity-70 group-hover:opacity-100 group-hover:text-brand-green transition-all">
              <MonitorPlay className="w-12 h-12" />
            </div>
            <h2 className="text-xl font-bold mb-2 tracking-widest">교실 칠판</h2>
            <p className="text-[#555] text-xs tracking-widest">수신 전용 화면</p>
          </button>
        </div>
      </div>
    </div>
  );
}
