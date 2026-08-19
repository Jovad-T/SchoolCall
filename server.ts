import express from "express";
import multer from "multer";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  app.post("/api/extract-meal", async (req, res) => {
    try {
      const { base64, mimeType } = req.body;
      
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: [
          { inlineData: { data: base64, mimeType } },
          { text: "Extract the lunch and dinner menu from this image or document. Return a JSON object with 'lunch' and 'dinner' arrays containing strings of food items. Ignore times, dates, or nutritional info. Just the food names." }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              lunch: { type: Type.ARRAY, items: { type: Type.STRING } },
              dinner: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["lunch", "dinner"]
          }
        }
      });

      res.json(JSON.parse(response.text));
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/extract-timetable", async (req, res) => {
    try {
      const { base64, mimeType } = req.body;
      
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: [
          { inlineData: { data: base64, mimeType } },
          { text: "Extract the weekly school timetable from this image/document. Return a JSON object with keys '1', '2', '3', '4', '5' representing Monday to Friday. Each key should have an array of exactly 7 strings representing the subjects for periods 1 to 7. If a period is empty, use an empty string. Ignore times and teachers, just the subject names." }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              "1": { type: Type.ARRAY, items: { type: Type.STRING } },
              "2": { type: Type.ARRAY, items: { type: Type.STRING } },
              "3": { type: Type.ARRAY, items: { type: Type.STRING } },
              "4": { type: Type.ARRAY, items: { type: Type.STRING } },
              "5": { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["1", "2", "3", "4", "5"]
          }
        }
      });

      res.json(JSON.parse(response.text));
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/extract-meal-url", async (req, res) => {
    try {
      const { url, date } = req.body;
      
      const fetchRes = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      const html = await fetchRes.text();

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Extract the lunch and dinner menu for the date ${date} (Format: YYYYMMDD) from the following school webpage HTML. 
Return a JSON object with 'lunch' and 'dinner' arrays containing strings of food items. Ignore times, dates, or nutritional info. Just the food names.
If the menu for the specific date is not found in the HTML, return empty arrays.
HTML Content:
${html.substring(0, 100000)}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              lunch: { type: Type.ARRAY, items: { type: Type.STRING } },
              dinner: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["lunch", "dinner"]
          }
        }
      });

      res.json(JSON.parse(response.text));
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  
  
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } 
});

  app.post("/api/parse-pdf", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "파일이 업로드되지 않았습니다." });
      }
      const data = await pdfParse(req.file.buffer);
      res.json({ text: data.text });
    } catch (error: any) {
      console.error("PDF 파싱 에러:", error);
      res.status(500).json({ error: "PDF 텍스트 추출 중 오류가 발생했습니다: " + error.message });
    }
  });

  app.post("/api/extract-pdf-text", async (req, res) => {
    try {
      const { base64 } = req.body;
      const buffer = Buffer.from(base64, 'base64');
      const data = await pdfParse(buffer);
      res.json({ text: data.text });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/refine-meal-text", async (req, res) => {
    try {
      const { text, date } = req.body;
      
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `입력된 텍스트에서 해당 날짜(${date})의 '중식'과 '석식' 메뉴만 각각 추출하고, 메뉴 옆에 붙은 괄호 속 알레르기 유발 물질 번호(예: 1.2.5.6)는 모두 제거한 뒤 깔끔한 문자열 배열로 반환해 줘. 만약 날짜에 해당하는 정보가 없다면 빈 배열을 반환해.\n\nRaw Text:\n${text.substring(0, 50000)}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              lunch: { type: Type.ARRAY, items: { type: Type.STRING } },
              dinner: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["lunch", "dinner"]
          }
        }
      });

      res.json(JSON.parse(response.text));
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/refine-timetable-text", async (req, res) => {
    try {
      const { text } = req.body;
      
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Here is raw OCR text extracted from a class timetable. Extract the schedule. Return a JSON object where keys are "1", "2", "3", "4", "5" representing Monday to Friday. The values should be arrays of strings representing the subjects from period 1 to 7. Ignore times, teacher names, etc.
If a period is empty, use an empty string "".
Raw OCR Text:
${text.substring(0, 50000)}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              "1": { type: Type.ARRAY, items: { type: Type.STRING } },
              "2": { type: Type.ARRAY, items: { type: Type.STRING } },
              "3": { type: Type.ARRAY, items: { type: Type.STRING } },
              "4": { type: Type.ARRAY, items: { type: Type.STRING } },
              "5": { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["1", "2", "3", "4", "5"]
          }
        }
      });

      res.json(JSON.parse(response.text));
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  
  app.post("/api/extract-teacher-schedule", async (req, res) => {
    try {
      const { base64, mimeType } = req.body;
      
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: [
          { inlineData: { data: base64, mimeType } },
          { text: "이 이미지는 학교 시간표입니다. 표의 가로축은 '요일(월~금)', 세로축은 '교시(1~9)'입니다. 각 칸의 텍스트는 '과목/교사명' 구조로 되어 있습니다. 이 표를 분석하여 [{ dayOfWeek: 1, period: 1, subject: '진로활동', teacherName: '구민식' }, ...] 형태의 정확한 JSON 배열로만 응답해 주세요. 요일은 1(월요일)부터 5(금요일)까지의 숫자로 표시해주세요." }
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
                teacherName: { type: Type.STRING }
              },
              required: ["dayOfWeek", "period", "subject", "teacherName"]
            }
          }
        }
      });

      res.json(JSON.parse(response.text));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
