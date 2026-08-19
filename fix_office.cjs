const fs = require('fs');

const file = 'src/components/OfficeRemote.tsx';
let code = fs.readFileSync(file, 'utf8');

// Remove socket.io import if it exists
code = code.replace(/import \{ io \} from ["']socket\.io-client["'];\n?/g, '');
code = code.replace(/const socket = io\([^)]*\);\n?/g, '');

const oldHandleSaveAnnouncement = `  const handleSaveAnnouncement = () => {
    updateAnnouncement(announcementInput);
    socket.emit("send-notification", { text: announcementInput });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };`;

const newHandleSaveAnnouncement = `  const handleSaveAnnouncement = () => {
    updateAnnouncement(announcementInput);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };`;

if (code.includes(oldHandleSaveAnnouncement)) {
  code = code.replace(oldHandleSaveAnnouncement, newHandleSaveAnnouncement);
} else {
  // Try regex
  code = code.replace(/socket\.emit\("send-notification",\s*\{\s*text:\s*announcementInput\s*\}\);\n?/g, '');
}

// Any other socket.emit?
code = code.replace(/socket\.emit\([^;]+;\n?/g, '');

fs.writeFileSync(file, code);
