import { GoogleGenAI, Type } from "@google/genai";

export function getAiConfig() {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('school_config') : null;
  const parsed = saved ? JSON.parse(saved) : {};
  return {
    aiProvider: parsed.aiProvider || 'gemini',
    geminiApiKey: parsed.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY || (typeof window !== "undefined" && (window as any).VITE_GEMINI_API_KEY) || "",
    geminiModel: parsed.geminiModel || "gemini-3.8-flash",
    geminiThinkingLevel: parsed.geminiThinkingLevel || 'DEFAULT',
    groqApiKey: parsed.groqApiKey || "",
    groqModel: parsed.groqModel || "llama-3.3-70b-versatile"
  };
}

export async function callGroq(
  prompt: string,
  base64Data?: string,
  mimeType?: string,
  jsonMode: boolean = true
): Promise<string> {
  const { groqApiKey, groqModel } = getAiConfig();
  if (!groqApiKey) {
    throw new Error("Groq API 키가 입력되지 않았습니다. 관리자 설정에서 Groq API 키를 등록해주세요.");
  }

  const hasImage = base64Data && mimeType;
  
  let modelToUse = groqModel;
  if (hasImage) {
    if (groqModel === "llama-3.3-70b-versatile" || groqModel === "llama-3.1-8b-instant" || groqModel === "llama-3.2-90b-vision-preview") {
      modelToUse = "llama-3.2-11b-vision-preview";
    }
  }

  const contentArray: any[] = [{ type: "text", text: prompt }];
  if (hasImage) {
    contentArray.push({
      type: "image_url",
      image_url: {
        url: `data:${mimeType};base64,${base64Data}`
      }
    });
  }

  const body: any = {
    model: modelToUse,
    messages: [
      {
        role: "user",
        content: hasImage ? contentArray : prompt
      }
    ],
    temperature: 0.1
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${groqApiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API 호출 실패: ${response.status} ${response.statusText}\n${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callGemini(contents: any, responseSchema?: any, jsonMode: boolean = true): Promise<string> {
  const { geminiModel, geminiThinkingLevel } = getAiConfig();
  const ai = getGeminiClient();
  const config: any = {};
  if (jsonMode) {
    config.responseMimeType = "application/json";
  }
  if (responseSchema) {
    config.responseSchema = responseSchema;
  }
  if (geminiThinkingLevel && geminiThinkingLevel !== 'DEFAULT') {
    if (geminiThinkingLevel === 'HIGH') {
      config.thinkingConfig = { thinkingLevel: 2 };
    } else if (geminiThinkingLevel === 'LOW') {
      config.thinkingConfig = { thinkingLevel: 1 };
    } else if (geminiThinkingLevel === 'MINIMAL') {
      config.thinkingConfig = { thinkingLevel: 0 };
    }
  }

  const response = await ai.models.generateContent({
    model: geminiModel || "gemini-3.8-flash",
    contents,
    config
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini AI로부터 응답을 받지 못했습니다.");
  }
  return text;
}

export async function callUnifiedAi(
  prompt: string,
  base64Data?: string,
  mimeType?: string,
  jsonMode: boolean = true
): Promise<string> {
  const { aiProvider, groqApiKey } = getAiConfig();

  let effectiveProvider = aiProvider;
  if (effectiveProvider === 'groq' && !groqApiKey) {
    effectiveProvider = 'gemini';
  }

  if (effectiveProvider === 'groq') {
    return callGroq(prompt, base64Data, mimeType, jsonMode);
  }

  let contents: any[] = [];
  if (base64Data && mimeType) {
    contents.push({
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    });
  }
  contents.push({ text: prompt });

  return callGemini(contents, undefined, jsonMode);
}

export function getGeminiClient(): GoogleGenAI {
  const { geminiApiKey } = getAiConfig();

  if (!geminiApiKey) {
    throw new Error(
      "Gemini API 키가 설정되지 않았습니다. .env 파일 또는 Vercel 환경 변수에 VITE_GEMINI_API_KEY를 등록해 주세요."
    );
  }

  return new GoogleGenAI({ apiKey: geminiApiKey });
}

export function fileToBase64(
  file: File
): Promise<{ base64Data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) {
        reject(new Error("파일을 읽을 수 없습니다."));
        return;
      }
      const [header, base64Data] = result.split(",");
      const mimeType = header.split(":")[1].split(";")[0] || file.type || "image/png";
      resolve({ base64Data, mimeType });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export async function extractTimetableFromImage(
  file: File
): Promise<Record<string, string[]>> {
  const { aiProvider, groqApiKey } = getAiConfig();
  let effectiveProvider = aiProvider;
  if (effectiveProvider === 'groq' && !groqApiKey) {
    effectiveProvider = 'gemini';
  }
  if (effectiveProvider === 'groq') {
    const { base64Data, mimeType } = await fileToBase64(file);
    const promptText = `이 시간표 이미지에서 월요일부터 금요일까지(1~5) 각 요일별 1교시부터 7교시까지의 과목명을 추출해 주세요.
반환할 JSON 구조 요구사항:
- 키는 반드시 "1"(월), "2"(화), "3"(수), "4"(목), "5"(금) 문자열입니다.
- 각 키의 값은 1교시부터 7교시까지의 과목명 문자열 배열(string[], 총 7개 요소)입니다.
- 수업이 없거나 비어있는 교시는 빈 문자열 ""을 넣어주세요.
- 교시 번호, 시간(09:00 등), 학교명, 시간표 제목 등은 제외하고 순수 과목명만 추출해 주세요.
- 반드시 {"1":["과목",...], "2":[...], ...} 구조의 순수 JSON 객체여야 합니다.`;
    const text = await callGroq(promptText, base64Data, mimeType, true);
    return JSON.parse(text);
  }

  const { base64Data, mimeType } = await fileToBase64(file);
  const contents = [
    { inlineData: { data: base64Data, mimeType } },
    {
      text: `이 시간표 이미지에서 월요일부터 금요일까지(1~5) 각 요일별 1교시부터 7교시까지의 과목명을 추출해 주세요.
반환할 JSON 구조 요구사항:
- 키는 반드시 "1"(월), "2"(화), "3"(수), "4"(목), "5"(금) 문자열입니다.
- 각 키의 값은 1교시부터 7교시까지의 과목명 문자열 배열(string[], 총 7개 요소)입니다.
- 수업이 없거나 비어있는 교시는 빈 문자열 ""을 넣어주세요.
- 교시 번호, 시간(09:00 등), 학교명, 시간표 제목 등은 제외하고 순수 과목명(예: "국어", "수학", "영어", "체육", "한국사", "통합과학" 등)만 추출해 주세요.`,
    },
  ];

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      "1": { type: Type.ARRAY, items: { type: Type.STRING } },
      "2": { type: Type.ARRAY, items: { type: Type.STRING } },
      "3": { type: Type.ARRAY, items: { type: Type.STRING } },
      "4": { type: Type.ARRAY, items: { type: Type.STRING } },
      "5": { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["1", "2", "3", "4", "5"],
  };

  const text = await callGemini(contents, responseSchema, true);
  return JSON.parse(text);
}

export async function refineTimetableText(
  rawText: string
): Promise<Record<string, string[]>> {
  const { aiProvider, groqApiKey } = getAiConfig();
  let effectiveProvider = aiProvider;
  if (effectiveProvider === 'groq' && !groqApiKey) {
    effectiveProvider = 'gemini';
  }
  if (effectiveProvider === 'groq') {
    const promptText = `Here is raw OCR text extracted from a class timetable. Extract the schedule. Return a JSON object where keys are "1", "2", "3", "4", "5" representing Monday to Friday. The values should be arrays of strings representing the subjects from period 1 to 7. Ignore times, teacher names, etc.
If a period is empty, use an empty string "".
Raw OCR Text:
${rawText.substring(0, 50000)}`;
    const text = await callGroq(promptText, undefined, undefined, true);
    return JSON.parse(text);
  }

  const contents = `Here is raw OCR text extracted from a class timetable. Extract the schedule. Return a JSON object where keys are "1", "2", "3", "4", "5" representing Monday to Friday. The values should be arrays of strings representing the subjects from period 1 to 7. Ignore times, teacher names, etc.
If a period is empty, use an empty string "".
Raw OCR Text:
${rawText.substring(0, 50000)}`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      "1": { type: Type.ARRAY, items: { type: Type.STRING } },
      "2": { type: Type.ARRAY, items: { type: Type.STRING } },
      "3": { type: Type.ARRAY, items: { type: Type.STRING } },
      "4": { type: Type.ARRAY, items: { type: Type.STRING } },
      "5": { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["1", "2", "3", "4", "5"],
  };

  const text = await callGemini(contents, responseSchema, true);
  return JSON.parse(text);
}

export async function extractTeacherScheduleFromImage(
  file: File
): Promise<
  Array<{
    dayOfWeek: number;
    period: number;
    subject: string;
    teacherName: string;
  }>
> {
  const { aiProvider, groqApiKey } = getAiConfig();
  let effectiveProvider = aiProvider;
  if (effectiveProvider === 'groq' && !groqApiKey) {
    effectiveProvider = 'gemini';
  }
  if (effectiveProvider === 'groq') {
    const { base64Data, mimeType } = await fileToBase64(file);
    const promptText = `이 이미지는 학교 시간표입니다. 표의 가로축은 '요일(월~금)', 세로축은 '교시(1~9)'입니다. 각 칸의 텍스트는 '과목/교사명' 구조로 되어 있습니다. 이 표를 분석하여 [{"dayOfWeek": 1, "period": 1, "subject": "진로활동", "teacherName": "구민식"}] 형태의 정확한 JSON 배열로만 응답해 주세요. 요일은 1(월요일)부터 5(금요일)까지의 숫자로 표시해주세요.`;
    const text = await callGroq(promptText, base64Data, mimeType, true);
    return JSON.parse(text);
  }

  const { base64Data, mimeType } = await fileToBase64(file);
  const contents = [
    { inlineData: { data: base64Data, mimeType } },
    { text: "이 이미지는 학교 시간표입니다. 표의 가로축은 '요일(월~금)', 세로축은 '교시(1~9)'입니다. 각 칸의 텍스트는 '과목/교사명' 구조로 되어 있습니다. 이 표를 분석하여 [{ dayOfWeek: 1, period: 1, subject: '진로활동', teacherName: '구민식' }, ...] 형태의 정확한 JSON 배열로만 응답해 주세요. 요일은 1(월요일)부터 5(금요일)까지의 숫자로 표시해주세요." }
  ];

  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        dayOfWeek: { type: Type.INTEGER },
        period: { type: Type.INTEGER },
        subject: { type: Type.STRING },
        teacherName: { type: Type.STRING },
      },
      required: ["dayOfWeek", "period", "subject", "teacherName"],
    },
  };

  const text = await callGemini(contents, responseSchema, true);
  return JSON.parse(text);
}

export type ExtractedMealItem = {
  date: string; // 'YYYYMMDD' (e.g. '20260819')
  lunch: string[];
  dinner: string[];
};

export function normalizeMealDateKey(dateStr: string, referenceDate?: string): string {
  if (!dateStr) return referenceDate || "";
  let cleaned = String(dateStr).replace(/[^0-9]/g, "");
  if (cleaned.length === 4) {
    const yr = referenceDate ? referenceDate.substring(0, 4) : new Date().getFullYear().toString();
    cleaned = `${yr}${cleaned}`;
  } else if (cleaned.length === 6) {
    cleaned = `20${cleaned}`;
  }
  
  if (cleaned.length === 8) {
    const year = parseInt(cleaned.substring(0, 4), 10);
    const month = parseInt(cleaned.substring(4, 6), 10) - 1;
    const day = parseInt(cleaned.substring(6, 8), 10);
    // 로컬 시간대 오프셋 및 날짜 경계 오차(10/6 -> 10/7 등) 방지를 위한 정규화 (정오 12시 기준 설정)
    const d = new Date(year, month, day, 12, 0, 0);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
  }
  return cleaned;
}

export async function extractAllMealsFromImageOrText(
  fileOrText: File | string,
  referenceDate?: string
): Promise<ExtractedMealItem[]> {
  const { aiProvider, groqApiKey } = getAiConfig();
  let effectiveProvider = aiProvider;
  if (effectiveProvider === 'groq' && !groqApiKey) {
    effectiveProvider = 'gemini';
  }
  const normalizedRefDate = normalizeMealDateKey(referenceDate || "");
  const currentYear = normalizedRefDate
    ? normalizedRefDate.substring(0, 4)
    : new Date().getFullYear().toString();
  const currentMonth = normalizedRefDate
    ? normalizedRefDate.substring(4, 6)
    : String(new Date().getMonth() + 1).padStart(2, "0");

  const promptText = `2026년 10월 식단표 이미지입니다. 표(Table) 형식으로 되어 있으며, '중식' 또는 '석식' 행과 각 날짜 열(Column, 예: 5일, 6일, 7일...)의 교차 셀에 메뉴가 적혀 있습니다.
[중요 지침] 표의 테두리 선, 밑줄(Underline), 셀 구분선, 배경 이미지(나무 그림 등)나 디자인 요소에 방해받지 말고, '중식' 행에 해당하는 각 날짜별 메뉴들과 '석식' 행에 해당하는 각 날짜별 메뉴들을 정확히 읽어내어 추출해 주세요. 밑줄이나 표 선 때문에 텍스트가 걸쳐 있거나 가려져 있더라도 문맥을 파악하여 메뉴 이름을 온전히 복원해 주세요.

[2026년 10월 달력 기준 정보]:
- 1주차: 10월 1일(목), 10월 2일(금)
- 2주차: 10월 5일(월), 10월 6일(화), 10월 7일(수), 10월 8일(목), 10월 9일(금, 한글날)
- 3주차: 10월 12일(월) ~ 10월 16일(금)
- 4주차: 10월 19일(월) ~ 10월 23일(금)
- 5주차: 10월 26일(월) ~ 10월 30일(금)

식단표에 표기된 모든 날짜(1일~말일 등)의 점심(중식)과 저녁(석식) 메뉴를 빠짐없이 추출하여 [{ "date": "YYYYMMDD", "lunch": ["메뉴1", "메뉴2"], "dinner": ["메뉴1", "메뉴2"] }] 형태의 JSON 배열로 반환해 주세요.
1. date (또는 MLSV_YMD): 반드시 '20261006', '20261007' 등 8자리 정확한 날짜 형식으로 작성해 줘.
2. lunch: 해당 날짜의 점심/중식 메뉴 목록 (알레르기 번호 (2.5.6 등), 칼로리 정보, 원산지 등 불필요한 기호 제거하고 순수 음식 이름만).
3. dinner: 해당 날짜의 저녁/석식 메뉴 목록 (없으면 빈 배열 []).
4. 날짜 오름차순으로 모두 정렬해 줘.`;

  let rawList: any[];

  if (effectiveProvider === 'groq') {
    let text: string;
    if (typeof fileOrText === "string") {
      text = await callGroq(`${promptText}\n\n[식단 텍스트 자료]:\n${fileOrText.substring(0, 30000)}`, undefined, undefined, true);
    } else {
      const { base64Data, mimeType } = await fileToBase64(fileOrText);
      text = await callGroq(promptText, base64Data, mimeType, true);
    }
    rawList = JSON.parse(text);
  } else {
    let contents: any;
    if (typeof fileOrText === "string") {
      contents = `${promptText}\n\n[식단 텍스트 자료]:\n${fileOrText.substring(0, 70000)}`;
    } else {
      const { base64Data, mimeType } = await fileToBase64(fileOrText);
      contents = [
        { inlineData: { data: base64Data, mimeType } },
        { text: promptText },
      ];
    }

    const responseSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          date: { type: Type.STRING, description: "YYYYMMDD 형식의 8자리 날짜 문자열" },
          MLSV_YMD: { type: Type.STRING, description: "YYYYMMDD 형식의 8자리 날짜 키값" },
          lunch: { type: Type.ARRAY, items: { type: Type.STRING } },
          dinner: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["lunch", "dinner"],
      },
    };

    const text = await callGemini(contents, responseSchema, true);
    rawList = JSON.parse(text);
  }

  if (!Array.isArray(rawList)) {
    throw new Error("AI 응답이 배열 형식이 아닙니다.");
  }

  const cleanedList: ExtractedMealItem[] = rawList
    .map((item: any) => {
      const rawDate = normalizeMealDateKey(item.date || item.MLSV_YMD || "", currentYear + currentMonth + "01");

      const cleanMenuArray = (arr: any): string[] => {
        if (!arr) return [];
        if (Array.isArray(arr)) {
          return arr
            .map((s) =>
              String(s)
                .replace(/\([0-9.\s]+\)/g, "")
                .replace(/[①-⑳]/g, "")
                .trim()
            )
            .filter((s) => Boolean(s) && s !== "-" && s !== "없음");
        }
        if (typeof arr === "string") {
          return arr
            .split(/[\n,]/)
            .map((s) =>
              s
                .replace(/\([0-9.\s]+\)/g, "")
                .replace(/[①-⑳]/g, "")
                .trim()
            )
            .filter((s) => Boolean(s) && s !== "-" && s !== "없음");
        }
        return [];
      };

      return {
        date: rawDate,
        lunch: cleanMenuArray(item.lunch),
        dinner: cleanMenuArray(item.dinner),
      };
    })
    .filter((item) => item.date.length === 8 && (item.lunch.length > 0 || item.dinner.length > 0));

  cleanedList.sort((a, b) => a.date.localeCompare(b.date));

  return cleanedList;
}

export async function extractMealFromImageOrText(
  fileOrText: File | string,
  date: string
): Promise<{ lunch: string[]; dinner: string[] }> {
  const normalizedDate = normalizeMealDateKey(date);
  const allMeals = await extractAllMealsFromImageOrText(fileOrText, normalizedDate);
  const target = allMeals.find((m) => m.date === normalizedDate);
  if (target) {
    return { lunch: target.lunch, dinner: target.dinner };
  }
  if (allMeals.length > 0) {
    return { lunch: allMeals[0].lunch, dinner: allMeals[0].dinner };
  }
  return { lunch: [], dinner: [] };
}
