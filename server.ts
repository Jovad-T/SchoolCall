import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

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
