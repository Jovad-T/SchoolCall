const fs = require('fs');

let content = fs.readFileSync('src/components/ClassroomDisplay.tsx', 'utf8');

const oldLogicStart = content.indexOf('const inClass = checkIsClassTime(currentTime);');
const handleDismissAlertStart = content.indexOf('const handleDismissAlert = () => {');

if (oldLogicStart !== -1 && handleDismissAlertStart !== -1) {
  const beforeLogic = content.substring(0, oldLogicStart);
  const afterLogic = content.substring(handleDismissAlertStart);

  const newLogic = `const inClass = checkIsClassTime(currentTime);
  const wasInClassRef = useRef(false);
  const prevCallStatus = useRef(false);

  // [시간 전환 감지 및 큐 방출 로직]
  useEffect(() => {
    const currentlyInClass = checkIsClassTime(currentTime);
    
    // 직전까지 수업 중(true)이다가 방금 막 쉬는 시간(false)으로 바뀌었다면
    if (wasInClassRef.current === true && currentlyInClass === false) {
      if (pendingCalls.length > 0) {
        console.log("쉬는 시간이 되어 대기열의 알림을 표시합니다.");
        const latestCall = pendingCalls[pendingCalls.length - 1];
        setActiveAlert(latestCall);
        setPendingCalls([]); // 대기열 초기화
      }
    }
    
    // 현재 상태로 갱신
    wasInClassRef.current = currentlyInClass;
  }, [currentTime, pendingCalls, schedule]); // currentTime 변경마다 체크

  // [호출 알림 인터셉트 로직]
  useEffect(() => {
    if (state.callStatus && !prevCallStatus.current) {
      if (checkIsClassTime(new Date())) {
        console.log("수업 중이라 알림이 대기열에 추가되었습니다:", state);
        // 함수형 업데이트 필수
        setPendingCalls(prev => [...prev, state]);
      } else {
        setActiveAlert(state);
      }
    }
    
    if (!state.callStatus && prevCallStatus.current) {
       setActiveAlert(null);
    }
    
    prevCallStatus.current = state.callStatus;
  }, [state, schedule]);

  `;

  content = beforeLogic + newLogic + afterLogic;
  fs.writeFileSync('src/components/ClassroomDisplay.tsx', content);
  console.log("Queue logic updated successfully.");
} else {
  console.log("Could not find insertion points.");
}
