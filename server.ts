import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

function resolveGeminiModel(requestedModel?: string): string {
  if (!requestedModel) return "gemini-3.8-flash";
  if (requestedModel === "gemini-4-argon") return "gemini-4-argon";
  if (requestedModel === "gemini-3.8-flash") return "gemini-3.8-flash";
  if (requestedModel === "gemini-3.1-pro-preview") return "gemini-3.1-pro-preview";
  if (requestedModel === "gemini-3.1-flash-lite-preview" || requestedModel === "gemini-3.1-flash-lite") {
    return "gemini-3.1-flash-lite";
  }
  if (requestedModel.startsWith("gemini-")) return requestedModel;
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

  // ⚡ Automatic background upload & decryption endpoint for Appin (amc42.dat)
  app.post("/api/sync/appin-dat", express.raw({ type: "*/*", limit: "20mb" }), (req, res) => {
    try {
      let bytes: Uint8Array;
      if (Buffer.isBuffer(req.body)) {
        bytes = new Uint8Array(req.body);
      } else if (req.body && typeof req.body.base64 === "string") {
        bytes = new Uint8Array(Buffer.from(req.body.base64, "base64"));
      } else {
        return res.status(400).json({ success: false, error: "유효한 amc42.dat 바이너리 또는 base64 데이터가 없습니다." });
      }

      const APPIN_XOR_KEY = [0x37, 0x6E, 0x31, 0x62, 0x6D, 0x75]; // "7n1bmu"
      const decryptedBytes = new Uint8Array(bytes.length);
      let colIdx = 0;
      for (let i = 0; i < bytes.length; i++) {
        const b = bytes[i];
        if (b === 0x0A || b === 0x0D) {
          decryptedBytes[i] = b;
          colIdx = 0;
        } else {
          if (b > 0x20) {
            const x = b ^ APPIN_XOR_KEY[colIdx % 6];
            decryptedBytes[i] = x > 0x20 ? x : b;
          } else {
            decryptedBytes[i] = b;
          }
          colIdx++;
        }
      }

      const decodedText = new TextDecoder("euc-kr").decode(decryptedBytes);
      const rawLines = decodedText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

      const sbjLine = rawLines.find(l => l.startsWith("#sbjnames "));
      const clsLine = rawLines.find(l => l.startsWith("#clsnames "));
      const hndLine = rawLines.find(l => l.startsWith("#hnd "));
      const sjpIndex = rawLines.findIndex(l => l.startsWith("#sjp"));

      if (!sbjLine || sjpIndex === -1) {
        return res.status(400).json({ success: false, error: "amc42.dat 내부에서 #sbjnames 또는 #sjp 섹션을 찾지 못했습니다." });
      }

      const subjectMap: Record<number, string> = {};
      sbjLine.replace(/^#sbjnames\s+/, "").split(",").forEach((entry, idx) => {
        const name = entry.split("^")[0]?.trim();
        if (name) subjectMap[idx + 1] = name;
      });

      const classIndexMap: Record<number, string> = {};
      if (clsLine) {
        const cleanClsLine = clsLine.replace(/^#clsnames\s+/, "");
        const clsMatches = Array.from(cleanClsLine.matchAll(/(?:^|,)\s*\d+\^(\d+-\d+)@/g));
        clsMatches.forEach((m, idx) => {
          classIndexMap[idx + 1] = m[1];
        });
      }
      if (Object.keys(classIndexMap).length < 24) {
        for (let g = 1; g <= 3; g++) {
          for (let c = 1; c <= 8; c++) {
            const idx = (g - 1) * 8 + c;
            if (!classIndexMap[idx]) {
              classIndexMap[idx] = `${g}-${c}`;
            }
          }
        }
      }

      const schoolYearMatch = hndLine?.match(/#hnd\s+(\d{4})/);
      const baseYear = schoolYearMatch ? parseInt(schoolYearMatch[1], 10) : new Date().getFullYear();
      const march1Utc = Date.UTC(baseYear, 2, 1);

      const sjpRowsByDay: Record<number, string> = {};
      const activeDayNums: number[] = [];
      for (let i = sjpIndex + 1; i < rawLines.length; i++) {
        const line = rawLines[i];
        const m = line.match(/^(\d+),\d+,\d+,\d+,\{/);
        if (m) {
          const dNum = parseInt(m[1], 10);
          sjpRowsByDay[dNum] = line;
          if (/\d+\(\d+/.test(line)) activeDayNums.push(dNum);
        }
      }

      const now = new Date(Date.now() + 9 * 3600000); // KST
      const refUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      const dayOfWeek = new Date(refUtc).getUTCDay();
      const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const mondayUtc = refUtc + diffToMon * 86400000;
      let targetMondayNum = Math.floor((mondayUtc - march1Utc) / 86400000) + 1;

      const hasWeekData = (monNum: number) =>
        [0, 1, 2, 3, 4].some(offset => activeDayNums.includes(monNum + offset));

      if (!hasWeekData(targetMondayNum) && activeDayNums.length > 0) {
        let closestDay = activeDayNums[activeDayNums.length - 1];
        let minDiff = Infinity;
        for (const d of activeDayNums) {
          const diff = Math.abs(d - targetMondayNum);
          if (diff < minDiff) {
            minDiff = diff;
            closestDay = d;
          }
        }
        const closestUtc = march1Utc + (closestDay - 1) * 86400000;
        const closestDow = new Date(closestUtc).getUTCDay();
        const closestDiffToMon = closestDow === 0 ? -6 : 1 - closestDow;
        targetMondayNum = closestDay + closestDiffToMon;
      }

      const isIgnoredSubj = (name?: string) =>
        !name || name === "대강" || name === "공강" || name === "복도감독";

      const formatCellSubject = (rawCell: string): string => {
        if (!rawCell) return "-";
        const activePart = rawCell.split("#")[0].trim();
        if (!activePart) return "-";
        const beforeParen = activePart.split("(")[0].trim();
        if (!beforeParen) return "-";

        const electMatch = beforeParen.match(/^(\d+)>(.+)$/);
        if (electMatch) {
          const groupCode = String.fromCharCode(64 + parseInt(electMatch[1], 10));
          const subjIds = electMatch[2]
            .split("+")
            .map(s => parseInt(s.replace(/\D/g, ""), 10))
            .filter(n => !isNaN(n) && n > 0);
          const validNames = subjIds
            .map(id => subjectMap[id])
            .filter(name => !isIgnoredSubj(name));
          if (validNames.length > 0) {
            return Array.from(new Set(validNames)).join("/");
          }
          return `${groupCode}선택`;
        }

        const subjIds = beforeParen
          .split("+")
          .map(s => parseInt(s.replace(/\D/g, ""), 10))
          .filter(n => !isNaN(n) && n > 0);
        const validNames = subjIds
          .map(id => subjectMap[id])
          .filter(name => !isIgnoredSubj(name));
        if (validNames.length > 0) {
          return Array.from(new Set(validNames)).join("/");
        }
        return "-";
      };

      const newTimetables: Record<string, Record<string, Record<number, string>>> = {
        ...(storeData.globalData.classTimetables || {})
      };
      let updatedCount = 0;

      for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
        const dNum = targetMondayNum + dayOffset;
        const rowStr = sjpRowsByDay[dNum];
        const dayKey = String(dayOffset + 1);
        if (!rowStr) continue;

        const classBlocks = rowStr.split("{").slice(1);
        for (const block of classBlocks) {
          const cols = block.split(",");
          const clsIdx = parseInt(cols[0], 10);
          const classKey = classIndexMap[clsIdx];
          if (!classKey) continue;

          if (!newTimetables[classKey]) newTimetables[classKey] = {};
          if (!newTimetables[classKey][dayKey]) newTimetables[classKey][dayKey] = {};

          for (let period = 1; period <= 7; period++) {
            const cellStr = cols[1 + period] || "";
            newTimetables[classKey][dayKey][period] = formatCellSubject(cellStr);
          }
          updatedCount++;
        }
      }

      storeData.globalData.classTimetables = newTimetables;
      storeData.globalData.appinLastAutoSyncAt = Date.now();
      persistStore();
      broadcastSSE("globalData", storeData.globalData);

      res.json({
        success: true,
        updatedClasses: Object.keys(classIndexMap).length,
        updatedDays: Math.floor(updatedCount / Math.max(1, Object.keys(classIndexMap).length)),
        syncedAt: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || "amc42.dat 자동 동기화 처리 실패" });
    }
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
      const {
        prompt,
        contents: rawContents,
        base64Data,
        mimeType,
        responseSchema,
        jsonMode = true,
        model: requestedModel,
        thinkingLevel,
        customApiKey
      } = req.body || {};

      const apiKey = (customApiKey && String(customApiKey).trim()) || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ success: false, error: "서버에 GEMINI_API_KEY가 설정되어 있지 않거나 유효한 키가 없습니다." });
      }

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

      const targetModel = resolveGeminiModel(requestedModel);
      let response;
      try {
        response = await ai.models.generateContent({
          model: targetModel,
          contents,
          config
        });
      } catch (primaryErr: any) {
        // 만약 상위 유료 사고 모델(gemini-4-argon 등) 권한이 없는 키라면 즉시 최신 gemini-3.8-flash + HIGH 사고 모드로 자동 폴백
        if (targetModel !== "gemini-3.8-flash") {
          response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents,
            config: {
              ...config,
              thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
            }
          });
        } else {
          throw primaryErr;
        }
      }

      res.json({ success: true, text: response.text || "" });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || "AI 분석 오류" });
    }
  };

  app.post("/api/gemini", handleGeminiRequest);
  app.post("/api/ai-parse", handleGeminiRequest);

  // 🔍 Live Reasoning Model Discovery Endpoint (새 API 키 입력 시 실시간 최신 사고 모델 탐색 및 자동 선택)
  app.post("/api/ai/discover-models", async (req, res) => {
    try {
      const { provider, apiKey } = req.body || {};
      const cleanKey = String(apiKey || "").trim();

      if (provider === "gemini") {
        const keyToCheck = cleanKey || process.env.GEMINI_API_KEY || "";
        const curated = [
          { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash (최신 초고속 심층 사고 모델 · 추천)" },
          { id: "gemini-4-argon", label: "Gemini 4 Argon (최상위 플래그십 고차원 사고/추론 모델)" },
          { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview (정밀 복합 추론 모델)" },
          { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite (경량 고속 모델)" }
        ];
        if (keyToCheck) {
          try {
            const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(keyToCheck)}`);
            if (r.ok) {
              const data = await r.json();
              const liveModels = (data.models || [])
                .map((m: any) => String(m.name || "").replace(/^models\//, ""))
                .filter((id: string) => id.startsWith("gemini-") && !id.includes("1.5") && !id.includes("2.0") && !id.includes("embedding"));
              for (const id of liveModels) {
                if (!curated.some(c => c.id === id)) {
                  curated.push({ id, label: `${id} (실시간 감지된 최신 모델)` });
                }
              }
            }
          } catch {}
        }
        return res.json({
          success: true,
          latestReasoningModel: cleanKey ? "gemini-4-argon" : "gemini-3.8-flash",
          thinkingLevel: "HIGH",
          models: curated
        });
      }

      if (provider === "openrouter") {
        const curated = [
          { id: "openai/o3", label: "OpenAI o3 (OpenRouter 최신 최상위 사고 모델)" },
          { id: "anthropic/claude-opus-4-6", label: "Claude Opus 4.6 (Extended Thinking 최고 추론)" },
          { id: "anthropic/claude-3.7-sonnet:thinking", label: "Claude 3.7 Sonnet Thinking (심층 사고 전용)" },
          { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (대용량 컨텍스트 정밀 추론)" },
          { id: "deepseek/deepseek-r1", label: "DeepSeek R1 (초고성능 오픈 추론 모델)" },
          { id: "openrouter/auto", label: "OpenRouter Auto (최적 사고 모델 자동 라우팅)" }
        ];
        try {
          const headers: Record<string, string> = {};
          if (cleanKey) headers["Authorization"] = `Bearer ${cleanKey}`;
          const r = await fetch("https://openrouter.ai/api/v1/models", { headers });
          if (r.ok) {
            const data = await r.json();
            const list = Array.isArray(data.data) ? data.data : [];
            const reasoningModels = list
              .filter((m: any) => {
                const id = String(m.id || "").toLowerCase();
                const arch = JSON.stringify(m.supported_parameters || []);
                return (
                  arch.includes("reasoning") ||
                  arch.includes("include_reasoning") ||
                  id.includes("o3") ||
                  id.includes("o4") ||
                  id.includes("gpt-5") ||
                  id.includes("claude-opus-4") ||
                  id.includes("claude-sonnet-4") ||
                  id.includes("thinking") ||
                  id.includes("deepseek-r1")
                );
              })
              .sort((a: any, b: any) => (Number(b.created) || 0) - (Number(a.created) || 0))
              .slice(0, 12)
              .map((m: any) => ({
                id: String(m.id),
                label: `${m.name || m.id} (최신 사고 모델)`
              }));

            if (reasoningModels.length > 0) {
              const merged = [...reasoningModels];
              for (const c of curated) {
                if (!merged.some(m => m.id === c.id)) merged.push(c);
              }
              return res.json({
                success: true,
                latestReasoningModel: merged[0].id,
                thinkingLevel: "HIGH",
                models: merged
              });
            }
          }
        } catch {}
        return res.json({
          success: true,
          latestReasoningModel: curated[0].id,
          thinkingLevel: "HIGH",
          models: curated
        });
      }

      if (provider === "chatgpt") {
        const curated = [
          { id: "o3", label: "OpenAI o3 (최신 최상위 심층 사고/추론 모델 · 추천)" },
          { id: "o4-mini", label: "OpenAI o4-mini (초고속 시각·수리 추론 사고 모델)" },
          { id: "gpt-5", label: "GPT-5 (최신 플래그십 통합 추론 모델)" },
          { id: "gpt-4.1", label: "GPT-4.1 (고정밀 멀티모달 분석 모델)" },
          { id: "gpt-4o", label: "GPT-4o (옴니 멀티모달 비전/텍스트 모델)" }
        ];
        if (cleanKey) {
          try {
            const r = await fetch("https://api.openai.com/v1/models", {
              headers: { Authorization: `Bearer ${cleanKey}` }
            });
            if (r.ok) {
              const data = await r.json();
              const list = Array.isArray(data.data) ? data.data : [];
              const liveReasoning = list
                .filter((m: any) => {
                  const id = String(m.id || "");
                  return /^(o3|o4|o1|gpt-5|gpt-4\.5|gpt-4\.1|gpt-4o)/.test(id) && !id.includes("audio") && !id.includes("realtime") && !id.includes("tts") && !id.includes("transcribe");
                })
                .sort((a: any, b: any) => (Number(b.created) || 0) - (Number(a.created) || 0))
                .slice(0, 12)
                .map((m: any) => ({
                  id: String(m.id),
                  label: `${m.id} (OpenAI 실시간 감지 최신 모델)`
                }));
              if (liveReasoning.length > 0) {
                const best =
                  liveReasoning.find((m: any) => /^o3(-|$)|^o4(-|$)|^gpt-5/.test(m.id)) ||
                  liveReasoning[0];
                const merged = [best, ...liveReasoning.filter((m: any) => m.id !== best.id)];
                for (const c of curated) {
                  if (!merged.some(m => m.id === c.id)) merged.push(c);
                }
                return res.json({
                  success: true,
                  latestReasoningModel: best.id,
                  thinkingLevel: "HIGH",
                  models: merged
                });
              }
            }
          } catch {}
        }
        return res.json({
          success: true,
          latestReasoningModel: curated[0].id,
          thinkingLevel: "HIGH",
          models: curated
        });
      }

      if (provider === "claude") {
        const curated = [
          { id: "claude-opus-4-6", label: "Claude Opus 4.6 (최신 최상위 Extended Thinking 사고 모델)" },
          { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5 (고성능 하이브리드 심층 사고 모델)" },
          { id: "claude-3-7-sonnet-latest", label: "Claude 3.7 Sonnet Latest (Extended Thinking 추론 모델)" },
          { id: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet Latest (고속 비전·문서 분석)" }
        ];
        if (cleanKey) {
          try {
            const r = await fetch("https://api.anthropic.com/v1/models", {
              headers: {
                "x-api-key": cleanKey,
                "anthropic-version": "2023-06-01"
              }
            });
            if (r.ok) {
              const data = await r.json();
              const list = Array.isArray(data.data) ? data.data : [];
              const liveModels = list
                .map((m: any) => ({
                  id: String(m.id),
                  label: `${m.display_name || m.id} (Anthropic 실시간 감지 최신 사고 모델)`
                }));
              if (liveModels.length > 0) {
                const merged = [...liveModels];
                for (const c of curated) {
                  if (!merged.some(m => m.id === c.id)) merged.push(c);
                }
                return res.json({
                  success: true,
                  latestReasoningModel: merged[0].id,
                  thinkingLevel: "HIGH",
                  models: merged
                });
              }
            }
          } catch {}
        }
        return res.json({
          success: true,
          latestReasoningModel: curated[0].id,
          thinkingLevel: "HIGH",
          models: curated
        });
      }

      if (provider === "groq") {
        const curated = [
          { id: "deepseek-r1-distill-llama-70b", label: "DeepSeek R1 Distill Llama 70B (최신 심층 사고/추론 모델 · 추천)" },
          { id: "qwen-qwq-32b", label: "Qwen QwQ 32B (고성능 수리·논리 사고 모델)" },
          { id: "meta-llama/llama-4-maverick-17b-128e-instruct", label: "Llama 4 Maverick 17B (최신 멀티모달 비전/추론 모델)" },
          { id: "meta-llama/llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout 17B (초고속 멀티모달 비전/추론)" },
          { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile (70B 고정밀 범용 분석)" }
        ];
        if (cleanKey) {
          try {
            const r = await fetch("https://api.groq.com/openai/v1/models", {
              headers: { Authorization: `Bearer ${cleanKey}` }
            });
            if (r.ok) {
              const data = await r.json();
              const list = Array.isArray(data.data) ? data.data : [];
              const liveModels = list
                .filter((m: any) => {
                  const id = String(m.id || "").toLowerCase();
                  return !id.includes("whisper") && !id.includes("guard") && !id.includes("tts");
                })
                .sort((a: any, b: any) => {
                  const aIsReasoning = /r1|qwq|llama-4|70b/i.test(a.id) ? 1 : 0;
                  const bIsReasoning = /r1|qwq|llama-4|70b/i.test(b.id) ? 1 : 0;
                  if (aIsReasoning !== bIsReasoning) return bIsReasoning - aIsReasoning;
                  return (Number(b.created) || 0) - (Number(a.created) || 0);
                })
                .map((m: any) => ({
                  id: String(m.id),
                  label: `${m.id} (Groq 실시간 감지 최신 모델)`
                }));
              if (liveModels.length > 0) {
                const best =
                  liveModels.find((m: any) => /deepseek-r1|qwq|llama-4/i.test(m.id)) ||
                  liveModels[0];
                const merged = [best, ...liveModels.filter((m: any) => m.id !== best.id)];
                for (const c of curated) {
                  if (!merged.some(m => m.id === c.id)) merged.push(c);
                }
                return res.json({
                  success: true,
                  latestReasoningModel: best.id,
                  thinkingLevel: "HIGH",
                  models: merged
                });
              }
            }
          } catch {}
        }
        return res.json({
          success: true,
          latestReasoningModel: curated[0].id,
          thinkingLevel: "HIGH",
          models: curated
        });
      }

      res.json({ success: false, error: "알 수 없는 AI 제공업체입니다." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || "모델 탐색 실패" });
    }
  });

  // 🌐 Unified Multi-Provider Server-Side AI Proxy (OpenRouter, ChatGPT/OpenAI, Claude/Anthropic, Groq, Gemini)
  app.post("/api/ai/generate", async (req, res) => {
    try {
      const {
        provider = "gemini",
        apiKey,
        model,
        thinkingLevel = "HIGH",
        prompt = "",
        base64Data,
        mimeType,
        jsonMode = true
      } = req.body || {};

      if (provider === "gemini") {
        req.body.customApiKey = apiKey;
        return handleGeminiRequest(req, res);
      }

      const cleanKey = String(apiKey || "").trim();
      if (!cleanKey) {
        return res.status(400).json({
          success: false,
          error: `${provider.toUpperCase()} API 키가 설정되지 않았습니다. 관리자 설정에서 API 키를 입력해 주세요.`
        });
      }

      const stripThinkTags = (raw: string) => {
        if (!raw) return "";
        return raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      };

      // 1. Anthropic Claude API (Messages API + Extended Thinking)
      if (provider === "claude") {
        const targetModel = model || "claude-opus-4-6";
        const contentParts: any[] = [];
        if (base64Data && mimeType) {
          if (mimeType === "application/pdf") {
            contentParts.push({
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: base64Data }
            });
          } else {
            contentParts.push({
              type: "image",
              source: { type: "base64", media_type: mimeType, data: base64Data }
            });
          }
        }
        contentParts.push({
          type: "text",
          text: jsonMode ? `${prompt}\n\n반드시 마크다운 코드블록 없이 순수 JSON 객체 또는 배열만 출력하세요.` : prompt
        });

        const useExtendedThinking =
          (thinkingLevel === "HIGH" || thinkingLevel === "DEFAULT") &&
          /3-7|opus-4|sonnet-4/i.test(targetModel);

        const claudeBody: Record<string, any> = {
          model: targetModel,
          max_tokens: useExtendedThinking ? 8192 : 4096,
          messages: [{ role: "user", content: contentParts }]
        };
        if (useExtendedThinking) {
          claudeBody.thinking = { type: "enabled", budget_tokens: 4000 };
        }

        let r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": cleanKey,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify(claudeBody)
        });

        // 만약 특정 신규 모델명이나 thinking 옵션이 계정 등급에서 거부되면 호환 모드로 자동 재시도
        if (!r.ok && useExtendedThinking) {
          delete claudeBody.thinking;
          claudeBody.max_tokens = 4096;
          r = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": cleanKey,
              "anthropic-version": "2023-06-01"
            },
            body: JSON.stringify(claudeBody)
          });
        }

        if (!r.ok) {
          const errTxt = await r.text();
          return res.status(r.status).json({ success: false, error: `Claude API 오류: ${errTxt}` });
        }
        const data = await r.json();
        const textBlocks = (data.content || [])
          .filter((b: any) => b.type === "text")
          .map((b: any) => b.text)
          .join("\n");
        return res.json({ success: true, text: stripThinkTags(textBlocks) });
      }

      // 2. OpenRouter / ChatGPT (OpenAI) / Groq (OpenAI-compatible Chat Completions)
      let endpoint = "https://api.openai.com/v1/chat/completions";
      let targetModel = model || "o3";
      const extraHeaders: Record<string, string> = {};

      if (provider === "openrouter") {
        endpoint = "https://openrouter.ai/api/v1/chat/completions";
        targetModel = model || "openai/o3";
        extraHeaders["HTTP-Referer"] = "https://aistudio.google.com";
        extraHeaders["X-Title"] = "School Smart Blackboard";
      } else if (provider === "groq") {
        endpoint = "https://api.groq.com/openai/v1/chat/completions";
        targetModel = model || "deepseek-r1-distill-llama-70b";
        // 이미지가 첨부되었는데 텍스트 전용 모델이 선택된 경우 최신 Llama 4 비전 모델로 스마트 전환
        if (base64Data && mimeType && !/vision|llama-4/i.test(targetModel)) {
          targetModel = "meta-llama/llama-4-scout-17b-16e-instruct";
        }
      }

      const userContent: any =
        base64Data && mimeType
          ? [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } }
            ]
          : prompt;

      const isOpenAiReasoningModel = /^(o1|o3|o4|gpt-5)/i.test(targetModel);
      const chatBody: Record<string, any> = {
        model: targetModel,
        messages: [{ role: "user", content: userContent }]
      };

      if (!isOpenAiReasoningModel) {
        chatBody.temperature = 0.1;
      } else if (provider === "chatgpt") {
        chatBody.reasoning_effort =
          thinkingLevel === "LOW" || thinkingLevel === "MINIMAL"
            ? "low"
            : thinkingLevel === "MEDIUM"
            ? "medium"
            : "high";
      }

      if (provider === "openrouter" && (thinkingLevel === "HIGH" || thinkingLevel === "DEFAULT")) {
        chatBody.include_reasoning = true;
      }

      if (jsonMode && !/deepseek-r1|qwq/i.test(targetModel)) {
        chatBody.response_format = { type: "json_object" };
      }

      let r = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cleanKey}`,
          ...extraHeaders
        },
        body: JSON.stringify(chatBody)
      });

      // 만약 response_format 이나 reasoning_effort 파라미터를 지원하지 않는 모델일 경우 깔끔한 기본 요청으로 재시도
      if (!r.ok) {
        delete chatBody.response_format;
        delete chatBody.reasoning_effort;
        delete chatBody.include_reasoning;
        if (provider === "chatgpt" && targetModel === "o3") {
          chatBody.model = "gpt-4o";
        }
        r = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cleanKey}`,
            ...extraHeaders
          },
          body: JSON.stringify(chatBody)
        });
      }

      if (!r.ok) {
        const errTxt = await r.text();
        return res.status(r.status).json({ success: false, error: `${provider.toUpperCase()} API 오류: ${errTxt}` });
      }

      const data = await r.json();
      const rawContent = data.choices?.[0]?.message?.content || "";
      return res.json({ success: true, text: stripThinkTags(rawContent) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || "외부 AI 호출 오류" });
    }
  });

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
