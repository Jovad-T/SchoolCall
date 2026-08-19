import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

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
        model: "gemini-3.7-flash",
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
        model: "gemini-3.7-flash",
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
        model: "gemini-3.7-flash",
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
        model: "gemini-3.7-flash",
        contents: `Here is raw OCR text extracted from a school meal schedule. Extract the lunch and dinner menu for the date ${date} (Format: YYYYMMDD). 
Return a JSON object with 'lunch' and 'dinner' arrays containing strings of food items. Ignore times, dates, or nutritional info. Just the food names.
If the menu for the specific date is not found in the text, return empty arrays.
Raw OCR Text:
${text.substring(0, 50000)}`,
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
        model: "gemini-3.7-flash",
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
