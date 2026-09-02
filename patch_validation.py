import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

validation_code = """
  if (viewMode === 'admin') {
    // === [입력 유효성 검사 로직 추가] ===
    const isSchoolNameValid = adminSchoolName.trim().length > 0;
    const isPinValid = /^\d{4}$/.test(adminPinInput.trim());
    const isNeisApiKeyValid = !adminNeisApiKey.trim() || /^[a-fA-F0-9]{32}$/.test(adminNeisApiKey.trim());
    const isGeminiApiKeyValid = !adminGeminiApiKey.trim() || /^AIza/.test(adminGeminiApiKey.trim());
    const isEduCodeValid = !adminEduCode.trim() || /^[A-Za-z]\d{2}$/.test(adminEduCode.trim());
    const isSchoolCodeValid = !adminSchoolCode.trim() || /^\d{7,8}$/.test(adminSchoolCode.trim());
    const isAppinUrlValid = !adminAppinServerUrl.trim() || /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?:\:[0-9]{1,5})?(?:\/.*)?$/.test(adminAppinServerUrl.trim()) || /^https?:\/\//.test(adminAppinServerUrl.trim());

    // 시간표 입력 검증: 1교시가 비어있는 요일이 있으면 경고 표시 (선택적)
    // 여기서는 형식적 오류 방지를 위해 입력칸들에 대한 주요 검증만 진행
    
    const warningMessages = [];
    if (!isSchoolNameValid) warningMessages.push("학교명을 입력해주세요.");
    if (!isPinValid) warningMessages.push("관리자 비밀번호는 4자리 숫자로 입력해야 합니다.");
    if (!isNeisApiKeyValid) warningMessages.push("나이스 API 키가 32자리 올바른 형식(영문/숫자)이 아닙니다.");
    if (!isGeminiApiKeyValid) warningMessages.push("Gemini API 키가 올바르지 않습니다 ('AIza'로 시작).");
    if (!isEduCodeValid) warningMessages.push("시도교육청 코드가 올바르지 않습니다 (예: J10).");
    if (!isSchoolCodeValid) warningMessages.push("표준학교코드가 올바르지 않습니다 (7~8자리 숫자).");
    if (!isAppinUrlValid) warningMessages.push("압핀 서버 주소가 올바르지 않습니다 (IP:포트 또는 URL 형식).");

    const isConfigValid = warningMessages.length === 0;

    const handleSaveClick = () => {
      if (!isConfigValid) {
        alert("입력값이 올바르지 않습니다. 경고 문구를 확인해주세요.\\n\\n" + warningMessages.join("\\n"));
        return;
      }
      handleSaveAdminSettings();
    };

    return ("""

content = content.replace("  if (viewMode === 'admin') {\n    return (", validation_code)

header_button_old = """          <button onClick={handleSaveAdminSettings} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md">
            저장 후 달력 동기화
          </button>"""
header_button_new = """          <button 
            onClick={handleSaveClick} 
            disabled={!isConfigValid}
            className={`px-5 py-2 rounded-xl text-xs font-bold shadow-md transition-colors ${isConfigValid ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
          >
            저장 후 달력 동기화
          </button>"""
content = content.replace(header_button_old, header_button_new)

footer_button_old = """            <button onClick={handleSaveAdminSettings} className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-sm font-bold cursor-pointer shadow-lg">
              설정 저장 및 달력 동기화
            </button>"""
footer_button_new = """            <div className="flex flex-col items-end gap-2">
              {!isConfigValid && (
                <div className="text-rose-400 text-xs font-bold bg-rose-900/30 px-3 py-2 rounded-lg border border-rose-800 text-right">
                  {warningMessages.map((msg, i) => <div key={i}>• {msg}</div>)}
                </div>
              )}
              <button 
                onClick={handleSaveClick} 
                disabled={!isConfigValid}
                className={`px-8 py-3.5 rounded-2xl text-sm font-bold shadow-lg transition-colors ${isConfigValid ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
              >
                설정 저장 및 달력 동기화
              </button>
            </div>"""
content = content.replace(footer_button_old, footer_button_new)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)

