const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

if (!code.includes('socket.io')) {
  // Add imports
  code = code.replace('import express from "express";', 'import express from "express";\nimport { createServer as createHttpServer } from "http";\nimport { Server } from "socket.io";');

  // Replace app.listen with httpServer.listen and add socket.io
  const setupCode = `
  const httpServer = createHttpServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    
    socket.on("send-notification", (data) => {
      console.log("Received notification:", data);
      io.emit("receive-notification", data);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(\`Server running on port \${PORT}\`);
  });
`;

  code = code.replace(/app\.listen\(PORT,\s*"0\.0\.0\.0",\s*\(\)\s*=>\s*\{[\s\S]*?\}\);/, setupCode);
  fs.writeFileSync('server.ts', code);
  console.log('server.ts patched');
} else {
  console.log('already patched');
}
