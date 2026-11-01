import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

function resolveGeminiModel(requestedModel?: string): string {
  if (requestedModel === "gemini-3.1-pro-preview") return "gemini-3.1-pro-preview";
  if (requestedModel === "gemini-3.1-flash-lite-preview" || requestedModel === "gemini-3.1-flash-lite") {
    return "gemini-3.1-flash-lite-preview";
  }
  return "gemini-3.8-flash";
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // 📂 Persistence store for real-time synchronization
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const storageFile = path.join(dataDir, "sync_store.json");

  let storeData: {
    globalData: Record<string, any>;
    announcements: Record<string, any>;
  } = {
    globalData: {},
    announcements: {}
  };

  try {
    if (fs.existsSync(storageFile)) {
      const raw = fs.readFileSync(storageFile, "utf-8");
      storeData = JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Failed to load sync_store.json:", e);
  }

  function persistStore() {
    try {
      fs.writeFileSync(storageFile, JSON.stringify(storeData, null, 2), "utf-8");
    } catch (e) {
      console.warn("Failed to save sync_store.json:", e);
    }
  }

  // 📡 Real-time SSE (Server-Sent Events) clients
  const sseClients = new Set<express.Response>();

  function broadcastSSE(type: string, payload: any) {
    const message = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of Array.from(sseClients)) {
      try {
        client.write(message);
        (client as any).flush?.();
      } catch {
        sseClients.delete(client);
      }
    }
  }

  // 🔗 SSE Stream endpoint
  app.get("/api/sync/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    sseClients.add(res);

    // Send initial snapshot on connect
    if (Object.keys(storeData.globalData).length > 0) {
      res.write(`event: globalData\ndata: ${JSON.stringify(storeData.globalData)}\n\n`);
    }
    // Send active announcements on connect
    if (storeData.announcements) {
      for (const [target, announcement] of Object.entries(storeData.announcements)) {
        if (announcement) {
          res.write(`event: announcement\ndata: ${JSON.stringify({ target, announcement })}\n\n`);
        }
      }
    }

    const keepAlive = setInterval(() => {
      try {
        res.write(": ping\n\n");
      } catch {
        clearInterval(keepAlive);
        sseClients.delete(res);
      }
    }, 20000);

    req.on("close", () => {
      clearInterval(keepAlive);
      sseClients.delete(res);
    });
  });

  // 📥 Get sync snapshot
  app.get("/api/sync/data", (req, res) => {
    res.json({
      success: true,
      globalData: storeData.globalData,
      announcements: storeData.announcements
    });
  });

  // 📥 Get current announcements
  app.get("/api/sync/announce", (req, res) => {
    res.json({
      success: true,
      announcements: storeData.announcements
    });
  });

  // 📤 Update globalData and broadcast to all connected devices
  app.post("/api/sync/data", (req, res) => {
    const updates = req.body || {};
    console.log("Server received sync updates:", JSON.stringify(updates));
    const merged: Record<string, any> = { ...storeData.globalData };
    for (const [key, val] of Object.entries(updates)) {
      if (key === 'timetableDetails') {
        merged[key] = val;
      } else if (
        val && 
        typeof val === 'object' && 
        !Array.isArray(val) && 
        merged[key] && 
        typeof merged[key] === 'object' && 
        !Array.isArray(merged[key])
      ) {
        merged[key] = { ...merged[key], ...val };
      } else {
        merged[key] = val;
      }
    }
    storeData.globalData = merged;
    persistStore();
    broadcastSSE("globalData", storeData.globalData);
    res.json({ success: true, globalData: storeData.globalData });
  });

  // 📢 Broadcast an announcement/call to blackboards
  app.post("/api/sync/announce", (req, res) => {
    const { target, announcement } = req.body || {};
    if (target && announcement) {
      storeData.announcements[target] = announcement;
      persistStore();
      broadcastSSE("announcement", { target, announcement });
    }
    res.json({ success: true });
  });

  // 🍽️ Fetch RiroSchool Meal Page (supports optional ID/PW login session)
  app.post("/api/riro-meal", async (req, res) => {
    try {
      const { url, riroId, riroPw, year, month } = req.body || {};
      if (!url) {
        return res.status(400).json({ success: false, error: "리로스쿨 주소를 입력해주세요." });
      }

      let targetUrl = String(url).trim();
      if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
        targetUrl = "https://" + targetUrl;
      }

      const parsedUrl = new URL(targetUrl);
      const origin = parsedUrl.origin;
      const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
      let cookieHeader = "";

      // Optional login if ID & PW provided
      if (riroId && riroPw) {
        try {
          const loginParams = new URLSearchParams();
          loginParams.append("app", "user");
          loginParams.append("mode", "login");
          loginParams.append("userType", "1");
          loginParams.append("id", String(riroId).trim());
          loginParams.append("pw", String(riroPw).trim());

          const loginRes = await fetch(`${origin}/ajax.php`, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
              "User-Agent": userAgent,
              "Referer": `${origin}/user.php`,
              "X-Requested-With": "XMLHttpRequest"
            },
            body: loginParams.toString(),
            redirect: "manual"
          });

          const rawCookies = (loginRes.headers as any).getSetCookie
            ? (loginRes.headers as any).getSetCookie()
            : [loginRes.headers.get("set-cookie")].filter(Boolean);
          if (rawCookies && rawCookies.length > 0) {
            cookieHeader = rawCookies.map((c: string) => c.split(";")[0]).join("; ");
          }
        } catch (loginErr) {
          console.warn("RiroSchool login attempt warning:", loginErr);
        }
      }

      // Candidate URLs to fetch (the user's URL + /meal.php if user only entered the main domain)
      const urlsToTry: string[] = [];
      if (parsedUrl.pathname === "/" || parsedUrl.pathname === "") {
        const ymQuery = year && month ? `?year=${year}&month=${String(month).padStart(2, "0")}` : "";
        urlsToTry.push(`${origin}/meal.php${ymQuery}`);
        urlsToTry.push(`${origin}/`);
      } else {
        urlsToTry.push(targetUrl);
      }

      let combinedHtml = "";
      let isGeoBlocked = false;
      for (const u of urlsToTry) {
        try {
          const pageRes = await fetch(u, {
            headers: {
              "User-Agent": userAgent,
              "Referer": origin,
              "Accept-Language": "ko-KR,ko;q=0.9",
              ...(cookieHeader ? { "Cookie": cookieHeader } : {})
            }
          });
          const html = await pageRes.text();
          if (html && (html.includes("해외 IP") || html.includes("접속이 제한되었습니다") || (html.includes("<title>에러페이지</title>") && html.includes("403")))) {
            isGeoBlocked = true;
            continue;
          }
          if (html && html.length > 100) {
            const cleaned = html
              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
              .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
              .replace(/<!--[\s\S]*?-->/g, " ")
              .replace(/\s+/g, " ");
            combinedHtml += `\n[SOURCE: ${u}]\n` + cleaned.substring(0, 25000);
          }
        } catch (e) {}
      }

      if (isGeoBlocked && !combinedHtml) {
        return res.status(200).json({
          success: false,
          isGeoBlocked: true,
          error: "리로스쿨 보안 정책상 클라우드 서버 IP에서의 직접 접속이 제한(403)되어 있습니다."
        });
      }

      if (!combinedHtml) {
        return res.status(200).json({ success: false, error: "리로스쿨 페이지에서 데이터를 가져오지 못했습니다." });
      }

      res.json({ success: true, data: combinedHtml });
    } catch (err: any) {
      res.status(200).json({ success: false, error: err?.message || "리로스쿨 연동 오류" });
    }
  });

  // 🤖 Server-side Gemini API handler
  const handleGeminiRequest = async (req: express.Request, res: express.Response) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ success: false, error: "서버에 GEMINI_API_KEY가 설정되어 있지 않습니다." });
      }

      const {
        prompt,
        contents: rawContents,
        base64Data,
        mimeType,
        responseSchema,
        jsonMode = true,
        model: requestedModel,
        thinkingLevel
      } = req.body || {};

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });

      let contents: any = rawContents;
      if (!contents) {
        const parts: any[] = [];
        if (base64Data && mimeType) {
          parts.push({ inlineData: { data: base64Data, mimeType } });
        }
        parts.push({ text: String(prompt || "") });
        contents = parts;
      }

      const config: Record<string, any> = {};
      if (jsonMode) {
        config.responseMimeType = "application/json";
      }
      if (responseSchema) {
        config.responseSchema = responseSchema;
      }
      if (thinkingLevel && thinkingLevel !== "DEFAULT") {
        if (thinkingLevel === "HIGH") {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
        } else if (thinkingLevel === "MEDIUM") {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.MEDIUM };
        } else if (thinkingLevel === "LOW" || thinkingLevel === "MINIMAL") {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        }
      }

      const response = await ai.models.generateContent({
        model: resolveGeminiModel(requestedModel),
        contents,
        config
      });

      res.json({ success: true, text: response.text || "" });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || "AI 분석 오류" });
    }
  };

  app.post("/api/gemini", handleGeminiRequest);
  app.post("/api/ai-parse", handleGeminiRequest);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
