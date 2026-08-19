const fs = require('fs');
const content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const newFunction = `
  const handleExtractTeacherSchedule = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert("파일 크기는 4MB 이하여야 합니다.");
      return;
    }

    setIsExtractingTeacher(true);
    setTeacherTtStatus("AI 모델이 이미지를 분석하여 교사별 시간표를 추출하고 있습니다... (약 10~20초 소요)");

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Str = event.target?.result as string;
        const [mimeTypeInfo, base64Data] = base64Str.split(',');
        const mimeType = mimeTypeInfo.split(':')[1].split(';')[0];

        try {
          const res = await fetch('/api/extract-teacher-schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64: base64Data, mimeType })
          });
          
          if (!res.ok) throw new Error("API 요청 실패");
          const extractedData = await res.json();
          
          if (Array.isArray(extractedData) && extractedData.length > 0) {
            // Mapping Logic
            let newRooms = [...rooms];
            let matchedCount = 0;
            const mappedTeachers = new Set();
            
            extractedData.forEach(item => {
               // Find teacher in rooms
               const roomIndex = newRooms.findIndex(r => r.teacherName === item.teacherName);
               if (roomIndex !== -1) {
                  const scheduleItem = newRooms[roomIndex].schedule || [];
                  
                  // Map period to time string based on global 'schedule' state
                  let timeStr = "";
                  if (schedule.length >= item.period) {
                     const slot = schedule[item.period - 1];
                     timeStr = \`\${slot.start}~\${slot.end}\`;
                  } else {
                     // Fallback mapping
                     const defaultTimes = ["09:00~09:50", "10:00~10:50", "11:00~11:50", "12:00~12:50", "14:00~14:50", "15:00~15:50", "16:00~16:50", "17:00~17:50", "18:00~18:50"];
                     timeStr = defaultTimes[item.period - 1] || "";
                  }
                  
                  // Check if this specific period is already in the teacher's schedule to prevent duplicate push if ran multiple times
                  const existingIdx = scheduleItem.findIndex(s => s.dayOfWeek === item.dayOfWeek && s.period === item.period);
                  if (existingIdx !== -1) {
                      scheduleItem[existingIdx] = { dayOfWeek: item.dayOfWeek, period: item.period, subject: item.subject, time: timeStr };
                  } else {
                      scheduleItem.push({ dayOfWeek: item.dayOfWeek, period: item.period, subject: item.subject, time: timeStr });
                  }
                  
                  newRooms[roomIndex].schedule = scheduleItem;
                  mappedTeachers.add(item.teacherName);
               }
            });
            
            await updateRooms(newRooms);
            setTeacherTtStatus(\`✅ 총 \${mappedTeachers.size}명의 선생님 시간표가 성공적으로 연동되었습니다.\`);
          } else {
            setTeacherTtStatus("⚠️ 이미지에서 교사 시간표 정보를 찾지 못했습니다.");
          }
        } catch (err) {
          console.error("AI extraction error:", err);
          setTeacherTtStatus("❌ AI 분석 중 오류가 발생했습니다.");
        } finally {
          setIsExtractingTeacher(false);
          setTimeout(() => setTeacherTtStatus(null), 5000);
          if (e.target) e.target.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsExtractingTeacher(false);
      setTeacherTtStatus("❌ 파일 처리 중 오류가 발생했습니다.");
      setTimeout(() => setTeacherTtStatus(null), 5000);
    }
  };
`;

const updated = content.replace('const handleMealUrlExtraction = async () => {', newFunction + '\n\n  const handleMealUrlExtraction = async () => {');
fs.writeFileSync('src/components/AdminDashboard.tsx', updated);
