import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BellRing, BellOff, User, MessageSquare, Home, XCircle, MapPin } from 'lucide-react';
import { useCallState, useLocalRoster } from '../lib/store';
import clsx from 'clsx';

const DUMMY_STUDENTS = [
  "1번 김학생", "2번 이학생", "3번 박학생", "4번 최학생", "5번 정학생"
];

const PRESET_MESSAGES = [
  "교무실로 오세요",
  "수행평가 평가지 가지고 오세요",
  "상담이 있으니 교무실로 오세요",
  "프린트물을 챙겨가세요",
  "긴급 호출입니다. 즉시 교무실로 오세요"
];

export default function OfficeRemote() {
  const navigate = useNavigate();
  const [grade, setGrade] = useState('2');
  const [classNm, setClassNm] = useState('8');
  
  const classId = `${grade}-${classNm}`;
  const { state, updateState, isFirebaseConnected } = useCallState(classId);
  const { roster, isLoading } = useLocalRoster(grade, classNm);

  const [selectedStudent, setSelectedStudent] = useState<string>('');
  
  useEffect(() => {
    if (state.studentName) {
      setSelectedStudent(state.studentName);
    } else if (roster.length > 0) {
      setSelectedStudent(roster[0]);
    } else {
      setSelectedStudent('');
    }
  }, [roster, state.studentName]);

  const [selectedMessage, setSelectedMessage] = useState<string>(state.message || PRESET_MESSAGES[0]);
  const [teacherName, setTeacherName] = useState<string>(state.teacherName || '');
  const [location, setLocation] = useState<string>(state.location || '교무실');

  const handleCall = () => {
    if (!selectedStudent) {
      alert('호출할 학생을 선택해주세요.');
      return;
    }
    updateState({
      callStatus: true,
      studentName: selectedStudent,
      message: selectedMessage,
      teacherName: teacherName,
      location: location
    });
  };

  const handleEndCall = () => {
    updateState({
      callStatus: false,
      studentName: '',
      message: '',
      teacherName: '',
      location: ''
    });
    setSelectedStudent(roster.length > 0 ? roster[0] : '');
    setSelectedMessage(PRESET_MESSAGES[0]);
  };

  const isCalling = state.callStatus;

  return (
    <div className="min-h-screen bg-bg-panel text-white flex flex-col font-sans">
      {/* Header */}
      <header className="p-6 border-b border-[#222] flex flex-col justify-center relative">
        <button 
          onClick={() => navigate('/')}
          className="absolute top-6 right-6 flex items-center gap-2 px-3 py-2 rounded-full bg-[#1A1A1C] border border-[#333] hover:border-[#555] text-[#AAA] hover:text-white transition-colors text-[10px] tracking-widest uppercase z-20"
        >
          <Home className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">처음으로 (모드 변경)</span>
        </button>
        <h3 className="text-[#555] uppercase text-[10px] font-bold tracking-[0.2em] mb-1 mt-2">Admin Console</h3>
        <h1 className="text-xl font-bold">OFFICE REMOTE</h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 flex flex-col max-w-lg w-full mx-auto space-y-8">
        
        {/* Form */}
        <div className="space-y-8 flex-1">
          {/* Class Select */}
          <section className="grid grid-cols-2 gap-4 bg-[#111] p-4 rounded-xl border border-[#333]">
            <div>
              <label className="text-[10px] uppercase text-[#777] font-bold mb-2 block tracking-wider">Grade (학년)</label>
              <select 
                value={grade}
                onChange={e => setGrade(e.target.value)}
                disabled={isCalling}
                className="w-full bg-[#1A1A1C] p-3 rounded-lg border border-[#333] text-sm focus:border-brand-red outline-none transition-colors text-white disabled:opacity-50"
              >
                {[1, 2, 3, 4, 5, 6].map(g => <option key={g} value={g}>{g}학년</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase text-[#777] font-bold mb-2 block tracking-wider">Class (반)</label>
              <select 
                value={classNm}
                onChange={e => setClassNm(e.target.value)}
                disabled={isCalling}
                className="w-full bg-[#1A1A1C] p-3 rounded-lg border border-[#333] text-sm focus:border-brand-red outline-none transition-colors text-white disabled:opacity-50"
              >
                {Array.from({length: 15}, (_, i) => i + 1).map(c => <option key={c} value={c}>{c}반</option>)}
              </select>
            </div>
          </section>

          {/* Student Select */}
          <section>
            <label className="text-[10px] uppercase text-[#777] font-bold mb-3 block tracking-wider">
              Select Student
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
              {isLoading ? (
                <div className="col-span-full p-4 text-center border border-dashed border-[#333] rounded-lg text-sm text-[#777]">
                  명단을 불러오는 중입니다...
                </div>
              ) : roster.length > 0 ? (
                roster.map(student => (
                  <button
                    key={student}
                    disabled={isCalling}
                    onClick={() => setSelectedStudent(student)}
                    className={clsx(
                      "h-10 rounded text-xs font-bold transition-colors",
                      selectedStudent === student 
                        ? "bg-brand-red text-black" 
                        : "bg-[#222] text-[#AAA] hover:bg-[#333]",
                      isCalling && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {student}
                  </button>
                ))
              ) : (
                <div className="col-span-full p-4 text-center border border-dashed border-[#333] rounded-lg text-sm text-[#777]">
                  해당 반의 명단이 관리자에 의해 아직 등록되지 않았습니다.
                </div>
              )}
            </div>
          </section>

          {/* Message Select */}
          <section>
            <label className="text-[10px] uppercase text-[#777] font-bold mb-3 block tracking-wider">
              Call Message
            </label>
            <div className="flex flex-col gap-2">
              {PRESET_MESSAGES.map(msg => (
                <button
                  key={msg}
                  disabled={isCalling}
                  onClick={() => setSelectedMessage(msg)}
                  className={clsx(
                    "text-left text-xs p-3 rounded-lg border transition-colors",
                    selectedMessage === msg 
                      ? "bg-bg-card border-brand-red/50 text-brand-red" 
                      : "bg-bg-card border-[#333] hover:border-[#555] text-[#AAA]",
                    isCalling && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {msg}
                </button>
              ))}
            </div>
          </section>

          {/* Teacher and Location */}
          <section>
            <label className="text-[10px] uppercase text-[#777] font-bold mb-3 block tracking-wider">
              Teacher & Location
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex bg-[#111] rounded-lg border border-[#333] focus-within:border-brand-red overflow-hidden">
                <div className="p-3 bg-[#1A1A1C] border-r border-[#333] flex items-center justify-center">
                  <User className="w-4 h-4 text-[#777]" />
                </div>
                <input 
                  type="text" 
                  disabled={isCalling}
                  placeholder="선생님 이름"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full bg-transparent p-3 text-sm outline-none text-white disabled:opacity-50"
                />
              </div>
              <div className="flex bg-[#111] rounded-lg border border-[#333] focus-within:border-brand-red overflow-hidden">
                <div className="p-3 bg-[#1A1A1C] border-r border-[#333] flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-[#777]" />
                </div>
                <input 
                  type="text" 
                  disabled={isCalling}
                  placeholder="도착 장소 (예: 교무실)"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-transparent p-3 text-sm outline-none text-white disabled:opacity-50"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Action Buttons */}
        <section className="mt-auto flex flex-col gap-3">
          {!isCalling ? (
            <button
              onClick={handleCall}
              className="w-full bg-brand-red text-black py-4 rounded-xl font-black text-sm tracking-widest shadow-[0_0_15px_rgba(255,62,62,0.4)] hover:brightness-110 transition-all"
            >
              SEND CALL ALERT
            </button>
          ) : (
            <button
              onClick={handleEndCall}
              className="w-full bg-[#1A1A1C] text-brand-red py-4 rounded-xl font-bold text-xs tracking-widest border border-brand-red/50 hover:border-brand-red hover:bg-brand-red/10 transition-colors flex items-center justify-center gap-2"
            >
              <XCircle className="w-5 h-5" />
              🛑 호출 종료 및 초기화
            </button>
          )}
        </section>
      </main>

      {/* System Logs */}
      <div className="p-4 bg-black/50 border-t border-[#222]">
        <div className="font-mono text-[9px] text-[#444] space-y-1 uppercase">
          <div>&gt; DB: {isFirebaseConnected ? "CONNECTED" : "LOCAL_SYNC"}</div>
          {isCalling ? (
            <>
              <div className="text-brand-green">&gt; SYNC: STATUS_ACTIVE</div>
              <div className="text-brand-red">&gt; CALL_SENT: {state.studentName}</div>
            </>
          ) : (
            <div>&gt; SYNC: STATUS_IDLE</div>
          )}
        </div>
      </div>
    </div>
  );
}
