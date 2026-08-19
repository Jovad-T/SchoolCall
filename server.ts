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
