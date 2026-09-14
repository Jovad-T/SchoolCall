const fs = require('fs');

function patchFile(filename) {
  let content = fs.readFileSync(filename, 'utf8');
  // Remove existing hide-window if any
  content = content.replace(/ipcMain\.on\('hide-window'[\s\S]*?\n\}\);\n/, '');
  
  if (!content.includes("ipcMain.on('hide-window'")) {
    const patch = `
ipcMain.on('hide-window', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(false);
    mainWindow.hide();
  }
});
`;
    // trigger-my-call 이 있는 곳 주변에 추가
    content = content.replace("ipcMain.on('trigger-my-call', () => {", patch + "\nipcMain.on('trigger-my-call', () => {");
    fs.writeFileSync(filename, content);
    console.log(filename + " patched");
  }
}

patchFile('class.cjs');
patchFile('main.cjs');
