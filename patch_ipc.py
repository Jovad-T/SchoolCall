import os

for filename in ["main.cjs", "class.cjs"]:
    if not os.path.exists(filename): continue
    with open(filename, "r", encoding="utf-8") as f:
        content = f.read()
    
    if "ipcMain.handle('fetch-local-url'" in content:
        # Replace the node-fetch part with native fetch
        content = content.replace("const fetch = (await import('node-fetch')).default || require('node-fetch');\n    const res = await fetch(url", "const res = await fetch(url")
        with open(filename, "w", encoding="utf-8") as f:
            f.write(content)

