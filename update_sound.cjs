const fs = require('fs');

let content = fs.readFileSync('src/components/ClassroomDisplay.tsx', 'utf8');

// 1. 외부 Audio 객체 선언
if (!content.includes('const alertSound = new Audio')) {
  content = content.replace(
    'export default function ClassroomDisplay',
    "const alertSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');\n\nexport default function ClassroomDisplay"
  );
}

// 2. 재생 로직 및 언락 로직
if (!content.includes('alertSound.play(')) {
  // Autoplay Unlock (빈 소리 실행 트릭)
  const unlockCode = `
    // 브라우저 자동재생(Autoplay) 차단 방어 (Unlock)
    alertSound.volume = 0; // 빈 소리로 만들기 위해 볼륨 0
    alertSound.play().then(() => {
      alertSound.pause();
      alertSound.currentTime = 0;
      alertSound.volume = 1; // 다시 정상 볼륨 복구
    }).catch(() => {});
`;
  content = content.replace(
    "localStorage.setItem('display_grade', tempSettings.grade);",
    unlockCode + "\n    localStorage.setItem('display_grade', tempSettings.grade);"
  );

  // 알림 모달 표시 시 사운드 재생
  const activeAlertEffect = `
  // 알림 모달이 표시될 때 알림음 재생
  useEffect(() => {
    if (activeAlert) {
      alertSound.currentTime = 0;
      alertSound.play().catch(err => console.warn("오디오 재생 실패 (Autoplay 차단 등):", err));
    }
  }, [activeAlert]);
`;
  content = content.replace(
    'const handleDismissAlert = () => {',
    activeAlertEffect + '\n  const handleDismissAlert = () => {'
  );
}

fs.writeFileSync('src/components/ClassroomDisplay.tsx', content);
