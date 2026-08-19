import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { motion } from 'motion/react';

export default function TvSetup() {
  const navigate = useNavigate();
  const [grade, setGrade] = useState('1');
  const [classNum, setClassNum] = useState('1');

  useEffect(() => {
    const savedInfo = localStorage.getItem('tvClassInfo');
    if (savedInfo) {
      const [g, c] = savedInfo.split('-');
      if (g && c) {
        navigate(`/tv/${g}/${c}`, { replace: true });
      }
    }
  }, [navigate]);

  const handleSave = () => {
    localStorage.setItem('tvClassInfo', `${grade}-${classNum}`);
    navigate(`/tv/${grade}/${classNum}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] flex flex-col items-center justify-center p-6 text-white font-sans selection:bg-yellow-500/30">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#111] p-10 rounded-3xl border border-[#222] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center"
      >
        <div className="w-16 h-16 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
          <Settings className="w-8 h-8 text-yellow-500" />
        </div>
        
        <h1 className="text-3xl font-black tracking-widest mb-2">초기 설정</h1>
        <p className="text-[#888] text-sm mb-10 text-center tracking-wider">이 기기(전자칠판)를 어느 학급으로<br/>설정할지 선택해 주세요.</p>
        
        <div className="w-full space-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase text-[#777] font-bold tracking-wider">학년 (Grade)</label>
            <select 
              value={grade}
              onChange={e => setGrade(e.target.value)}
              className="w-full bg-[#1A1A1C] p-4 rounded-xl border border-[#333] focus:border-yellow-500 outline-none transition-colors text-lg font-bold"
            >
              {[1, 2, 3, 4, 5, 6].map(g => (
                <option key={g} value={g}>{g}학년</option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase text-[#777] font-bold tracking-wider">반 (Class)</label>
            <select 
              value={classNum}
              onChange={e => setClassNum(e.target.value)}
              className="w-full bg-[#1A1A1C] p-4 rounded-xl border border-[#333] focus:border-yellow-500 outline-none transition-colors text-lg font-bold"
            >
              {Array.from({ length: 15 }, (_, i) => i + 1).map(c => (
                <option key={c} value={c}>{c}반</option>
              ))}
            </select>
          </div>
          
          <button
            onClick={handleSave}
            className="w-full bg-yellow-500 text-black py-4 mt-4 rounded-xl font-black text-lg tracking-widest hover:brightness-110 transition-all shadow-[0_0_15px_rgba(234,179,8,0.3)] active:scale-95"
          >
            이 교실로 설정하기
          </button>
        </div>
      </motion.div>
    </div>
  );
}
