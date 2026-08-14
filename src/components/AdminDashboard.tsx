import React, { useRef, useState } from 'react';
import { ref, set } from 'firebase/database';
import { db } from '../lib/firebase';
import { Upload, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        const groupedData: Record<string, Record<string, string[]>> = {};
        let studentCount = 0;

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          
          const parts = trimmed.split(',');
          if (parts.length >= 4) {
            const [g, c, num, name] = parts.map(p => p.trim());
            
            // 헤더 건너뛰기
            if (g === '학년' || isNaN(Number(g))) continue;
            
            if (!groupedData[g]) {
              groupedData[g] = {};
            }
            if (!groupedData[g][c]) {
              groupedData[g][c] = [];
            }
            
            groupedData[g][c].push(`${num}번 ${name}`);
            studentCount++;
          }
        }

        if (Object.keys(groupedData).length > 0 && db) {
          await set(ref(db, 'school_data/students'), groupedData);
          setUploadStatus(`✅ 마스터 데이터 갱신 완료: 총 ${studentCount}명의 학생 명단이 시스템에 일괄 등록되었습니다.`);
        } else if (!db) {
          alert("Firebase 연결이 필요합니다.");
        } else {
          alert("유효한 CSV 데이터가 없습니다. 형식: '학년,반,번호,이름'");
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
  };

  return (
    <div className="min-h-screen bg-bg-dark grid-bg flex flex-col items-center justify-center p-6 text-[#E0E0E0] font-sans relative">
      <button 
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 z-40 flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 border border-[#333] hover:border-[#555] text-[#AAA] hover:text-white transition-colors backdrop-blur text-xs tracking-widest uppercase"
      >
        <Home className="w-4 h-4" /> 홈으로
      </button>

      <div className="max-w-xl w-full text-center space-y-12">
        <div className="space-y-4">
          <h2 className="text-brand-red uppercase tracking-[0.2em] text-xs font-bold">Master Admin Only</h2>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white">
            전교생 명렬표 관리(마스터)
          </h1>
        </div>

        <div className="glass-card p-10 rounded-2xl border border-brand-red/30 flex flex-col items-center justify-center">
          <input 
            type="file" 
            accept=".csv"
            ref={fileInputRef}
            onChange={handleFileUpload}
            disabled={isUploading}
            className="block w-full max-w-sm text-sm text-[#AAA]
              file:mr-4 file:py-3 file:px-6
              file:rounded-full file:border-0
              file:text-sm file:font-bold file:tracking-widest
              file:bg-brand-red file:text-black
              hover:file:brightness-110 hover:file:cursor-pointer
              transition-all disabled:opacity-50"
          />
          
          {uploadStatus && (
            <div className="mt-6 text-center px-4 py-4 bg-[#1A1A1C] border border-brand-green/30 text-brand-green text-sm rounded-lg shadow-lg">
              {uploadStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
