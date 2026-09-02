import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

fetch_handler = """
  const handleFetchAppinServer = async () => {
    if (!adminAppinServerUrl) {
      alert("압핀 서버 주소(IP 등)를 입력해주세요.");
      return;
    }
    const apiKey = schoolConfig.geminiApiKey || schoolConfig.neisApiKey;
    if (!apiKey) {
      alert("❌ [API 키 필요] 관리자 모드에 Google Gemini API 키를 입력해주세요. (서버 HTML 분석용)");
      return;
    }
    setIsNeisLoading(true);
    try {
      let htmlText = "";
      if ((window as any).electron?.ipcRenderer) {
        const res = await (window as any).electron.ipcRenderer.invoke('fetch-local-url', { url: adminAppinServerUrl });
        if (!res.success) throw new Error(res.error);
        htmlText = res.data;
      } else {
        const res = await fetch(adminAppinServerUrl.startsWith('http') ? adminAppinServerUrl : 'http://' + adminAppinServerUrl);
        htmlText = await res.text();
      }

      if (!htmlText || htmlText.length < 100) {
        throw new Error("서버에서 유효한 데이터를 받지 못했습니다.");
      }

      // Send HTML to Gemini
      const promptText = `
너는 학교 시간표 분석 AI야. 다음은 학교 내부망 시간표 서버에서 가져온 HTML 소스코드야.
여기서 ${editTargetGrade}학년 ${editTargetClass}반의 이번 주(월~금요일), 1교시부터 7교시까지의 수업 과목을 전부 추출해줘.
[엄격한 추출 규칙]
1. 월요일은 "1", 화요일은 "2", 수요일은 "3", 목요일은 "4", 금요일은 "5" 를 최상위 키(key)로 사용해.
2. 시간표 칸 안에 슬래시(/)나 괄호 뒤에 붙은 교사 이름이나 장소는 완벽하게 제거해. (예: "진로활동/구민" -> "진로활동", "미술과매체/박지/미술실" -> "미술과 매체")
3. 과목명 앞의 A, B, C, D 등 이동수업 알파벳을 완벽하게 제거해. (예: "C세포와물질대사" -> "세포와 물질대사", "B미술감상과비평" -> "미술 감상과 비평")
4. 띄어쓰기를 예쁘게 교정해 (예: 독서와작문 -> 독서와 작문)
5. 빈칸은 "-" 로 표시해.
6. 반드시 마크다운 백틱 없이 순수 JSON 포맷으로만 응답해.

응답 예시:
{
  "1": { "1": "진로활동", "2": "독서와 작문", "3": "역학과 에너지", "4": "프랑스어 회화", "5": "세포와 물질대사", "6": "미술과 매체", "7": "미적분I" },
  "2": { "1": "독서와 작문", "2": "자율활동", "3": "스포츠 과학", "4": "미술과 매체", "5": "미적분I", "6": "영어II", "7": "미술 감상과 비평" },
  "3": { "1": "독서와 작문", "2": "프랑스어 회화", "3": "영어II", "4": "스포츠 과학", "5": "역학과 에너지", "6": "-", "7": "창체" },
  "4": { "1": "...", ... },
  "5": { "1": "...", ... }
}

HTML 소스코드:
${htmlText.substring(0, 30000)}
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { temperature: 0.1 }
        })
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error?.message || 'API 오류');

      let responseText = json.candidates[0].content.parts[0].text;
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

      const parsedObj = JSON.parse(responseText);
      const classKey = `${editTargetGrade}-${editTargetClass}`;
      setTempClassTimetables(prev => ({
        ...prev,
        [classKey]: parsedObj
      }));

      alert(`✅ 서버 접속 성공! ${editTargetGrade}학년 ${editTargetClass}반의 이번 주 시간표를 인공지능이 추출했습니다.`);
    } catch (err: any) {
      console.error(err);
      alert('❌ 서버 연동 실패: ' + (err.message || '학교 내부망(IP) 접근 제한이거나 서버가 꺼져있을 수 있습니다. (Electron PC 앱 권장)'));
    } finally {
      setIsNeisLoading(false);
    }
  };
"""

content = content.replace(
    "const handleTimetableImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {",
    fetch_handler + "\n\n  const handleTimetableImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {"
)

ui_code = """
                <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-emerald-900/40">
                  <span className="text-sm font-bold text-emerald-200">내부망 서버 직접 연동 (URL/IP)</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={adminAppinServerUrl}
                      onChange={e => setAdminAppinServerUrl(e.target.value)}
                      placeholder="예: 10.123.119.248/1053"
                      className="flex-1 px-4 py-2.5 bg-black/40 text-white rounded-xl border border-emerald-800 text-sm focus:border-emerald-500 outline-none"
                    />
                    <button
                      onClick={handleFetchAppinServer}
                      disabled={isNeisLoading || !adminAppinServerUrl}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md transition-colors whitespace-nowrap"
                    >
                      {isNeisLoading ? "접속 중..." : "서버에서 추출"}
                    </button>
                  </div>
                  <p className="text-[10px] text-emerald-400/60">※ 접속상태 하단에 표시된 서버 주소를 입력하면, 해당 서버의 시간표 정보를 인공지능이 분석하여 채워줍니다.</p>
                </div>
"""

content = content.replace(
    """<p className="text-[11px] text-emerald-400/80 text-center bg-emerald-900/30 py-2 rounded-lg">※ 컴시간/압핀 엑셀 파일을 올리면 전체 학급이 1초 만에 최신화됩니다. (이미지는 현재 학급만 AI로 분석)</p>""",
    """<p className="text-[11px] text-emerald-400/80 text-center bg-emerald-900/30 py-2 rounded-lg">※ 컴시간/압핀 엑셀 파일을 올리면 전체 학급이 1초 만에 최신화됩니다. (이미지는 현재 학급만 AI로 분석)</p>\n""" + ui_code
)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)

