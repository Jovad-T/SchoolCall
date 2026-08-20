import { GoogleGenAI, Type } from "@google/genai";

/**
 * Client-side Gemini AI client instance getter.
 * Retrieves the API key from Vite environment variable: import.meta.env.VITE_GEMINI_API_KEY
 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey =
    import.meta.env.VITE_GEMINI_API_KEY ||
    (typeof window !== "undefined" && (window as any).VITE_GEMINI_API_KEY) ||
    "";

  if (!apiKey) {
    throw new Error(
      "Gemini API 키가 설정되지 않았습니다. .env 파일 또는 Vercel 환경 변수에 VITE_GEMINI_API_KEY를 등록해 주세요."
    );
  }

  return new GoogleGenAI({ apiKey });
}

/**
 * Helper to convert a File object to base64 string and mimeType
 */
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

/**
 * Directly extract timetable grid from an uploaded timetable image using client-side Gemini multimodal API.
 * Returns a JSON object with keys "1", "2", "3", "4", "5" (Monday to Friday),
 * each with an array of 7 subject strings for periods 1 to 7.
 */
export async function extractTimetableFromImage(
  file: File
): Promise<Record<string, string[]>> {
  const ai = getGeminiClient();
  const { base64Data, mimeType } = await fileToBase64(file);

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: [
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
      {
        text: `이 시간표 이미지에서 월요일부터 금요일까지(1~5) 각 요일별 1교시부터 7교시까지의 과목명을 추출해 주세요.

반환할 JSON 구조 요구사항:
- 키는 반드시 "1"(월), "2"(화), "3"(수), "4"(목), "5"(금) 문자열입니다.
- 각 키의 값은 1교시부터 7교시까지의 과목명 문자열 배열(string[], 총 7개 요소)입니다.
- 수업이 없거나 비어있는 교시는 빈 문자열 ""을 넣어주세요.
- 교시 번호, 시간(09:00 등), 학교명, 시간표 제목 등은 제외하고 순수 과목명(예: "국어", "수학", "영어", "체육", "한국사", "통합과학" 등)만 추출해 주세요.
- 교사명이 과목과 함께 적혀있다면 과목명만 추출하거나 "수학/김선생" 형식으로 유지해도 됩니다.`,
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          "1": {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "월요일 1~7교시 과목 배열",
          },
          "2": {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "화요일 1~7교시 과목 배열",
          },
          "3": {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "수요일 1~7교시 과목 배열",
          },
          "4": {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "목요일 1~7교시 과목 배열",
          },
          "5": {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "금요일 1~7교시 과목 배열",
          },
        },
        required: ["1", "2", "3", "4", "5"],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini AI로부터 응답을 받지 못했습니다.");
  }

  const parsed = JSON.parse(text);
  return parsed;
}

/**
 * Refine OCR text to timetable grid using client-side Gemini API.
 */
export async function refineTimetableText(
  rawText: string
): Promise<Record<string, string[]>> {
  const ai = getGeminiClient();

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: `Here is raw OCR text extracted from a class timetable. Extract the schedule. Return a JSON object where keys are "1", "2", "3", "4", "5" representing Monday to Friday. The values should be arrays of strings representing the subjects from period 1 to 7. Ignore times, teacher names, etc.
If a period is empty, use an empty string "".
Raw OCR Text:
${rawText.substring(0, 50000)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          "1": { type: Type.ARRAY, items: { type: Type.STRING } },
          "2": { type: Type.ARRAY, items: { type: Type.STRING } },
          "3": { type: Type.ARRAY, items: { type: Type.STRING } },
          "4": { type: Type.ARRAY, items: { type: Type.STRING } },
          "5": { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["1", "2", "3", "4", "5"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini AI로부터 응답을 받지 못했습니다.");
  return JSON.parse(text);
}

/**
 * Extract teacher schedule array from an uploaded image using client-side Gemini multimodal API.
 */
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
  const ai = getGeminiClient();
  const { base64Data, mimeType } = await fileToBase64(file);

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: [
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
      {
        text: "이 이미지는 학교 시간표입니다. 표의 가로축은 '요일(월~금)', 세로축은 '교시(1~9)'입니다. 각 칸의 텍스트는 '과목/교사명' 구조로 되어 있습니다. 이 표를 분석하여 [{ dayOfWeek: 1, period: 1, subject: '진로활동', teacherName: '구민식' }, ...] 형태의 정확한 JSON 배열로만 응답해 주세요. 요일은 1(월요일)부터 5(금요일)까지의 숫자로 표시해주세요.",
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
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
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini AI로부터 응답을 받지 못했습니다.");
  return JSON.parse(text);
}

export type ExtractedMealItem = {
  date: string; // 'YYYYMMDD' (e.g. '20260819')
  lunch: string[];
  dinner: string[];
};

/**
 * Extract monthly or all-date meal menu items from an uploaded meal schedule image or text using client-side Gemini API.
 * Prompted to extract all dates as a JSON array: [{ date: 'YYYYMMDD', lunch: [...], dinner: [...] }, ...]
 */
export async function extractAllMealsFromImageOrText(
  fileOrText: File | string,
  referenceDate?: string
): Promise<ExtractedMealItem[]> {
  const ai = getGeminiClient();
  const currentYear = referenceDate
    ? referenceDate.substring(0, 4)
    : new Date().getFullYear().toString();
  const currentMonth = referenceDate
    ? referenceDate.substring(4, 6)
    : String(new Date().getMonth() + 1).padStart(2, "0");

  const promptText = `해당 식단표(또는 월간 급식표)에 있는 '모든 날짜'의 점심(중식)과 저녁(석식) 메뉴를 빠짐없이 추출해서 [{ date: 'YYYYMMDD', lunch: ['메뉴1', '메뉴2'], dinner: ['메뉴1', '메뉴2'] }, ...] 형태의 JSON 배열(Array)로 반환해 줘.

[상세 지침]:
1. date: 반드시 'YYYYMMDD' 형태의 8자리 숫자 문자열(예: '20260801', '20260819')로 작성해. 이미지/문서에 연도가 생략되어 있거나 날짜만 표기되어 있다면 기본 기준 연도(${currentYear}년)와 기준 월(${currentMonth}월)을 참고하여 정확한 8자리 YYYYMMDD로 포맷팅해 줘.
2. lunch: 해당 날짜의 점심/중식 메뉴 목록. 메뉴명 옆의 괄호 안 알레르기 유발물질 번호(예: 1.2.5.6, ①② 등), 칼로리(kcal), 원산지 등 불필요한 기호는 완전히 제거하고 깨끗한 음식명 문자열만 포함해 줘.
3. dinner: 해당 날짜의 저녁/석식 메뉴 목록. 석식 메뉴가 없거나 적혀있지 않은 날은 빈 배열 []로 반환해 줘.
4. 식단표에 표기된 모든 날짜(1일~말일 등)를 누락 없이 날짜 오름차순으로 모두 추출해 줘.`;

  let contents: any;
  if (typeof fileOrText === "string") {
    contents = `${promptText}\n\n[식단 텍스트 자료]:\n${fileOrText.substring(0, 70000)}`;
  } else {
    const { base64Data, mimeType } = await fileToBase64(fileOrText);
    contents = [
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
      {
        text: promptText,
      },
    ];
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            date: {
              type: Type.STRING,
              description: "YYYYMMDD 형식의 8자리 날짜 문자열 (예: 20260819)",
            },
            lunch: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "점심/중식 메뉴 배열",
            },
            dinner: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "저녁/석식 메뉴 배열",
            },
          },
          required: ["date", "lunch", "dinner"],
        },
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini AI로부터 응답을 받지 못했습니다.");

  const rawList = JSON.parse(text);
  if (!Array.isArray(rawList)) {
    throw new Error("Gemini AI 응답이 배열 형식이 아닙니다.");
  }

  // Normalize and clean up dates and array elements
  const cleanedList: ExtractedMealItem[] = rawList
    .map((item: any) => {
      let rawDate = String(item.date || "").replace(/[^0-9]/g, "");
      if (rawDate.length === 4) {
        // e.g. MMDD -> YYYYMMDD
        rawDate = `${currentYear}${rawDate}`;
      } else if (rawDate.length === 6) {
        // e.g. YYMMDD -> 20YYMMDD
        rawDate = `20${rawDate}`;
      }

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

/**
 * Backward-compatible single-date or monthly meal extraction helper.
 */
export async function extractMealFromImageOrText(
  fileOrText: File | string,
  date: string
): Promise<{ lunch: string[]; dinner: string[] }> {
  const allMeals = await extractAllMealsFromImageOrText(fileOrText, date);
  const target = allMeals.find((m) => m.date === date);
  if (target) {
    return { lunch: target.lunch, dinner: target.dinner };
  }
  if (allMeals.length > 0) {
    return { lunch: allMeals[0].lunch, dinner: allMeals[0].dinner };
  }
  return { lunch: [], dinner: [] };
}
