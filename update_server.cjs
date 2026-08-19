const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

if (!content.includes("import pdfParse")) {
  content = content.replace('import { GoogleGenAI, Type } from "@google/genai";', 'import { GoogleGenAI, Type } from "@google/genai";\nimport pdfParse from "pdf-parse";');
}

const promptSearch = /contents: \`Here is raw OCR text extracted from a school meal schedule[\s\S]*?\${text\.substring\(0, 50000\)}\`,/;
const promptReplace = `contents: \`입력된 텍스트에서 해당 날짜(\${date})의 '중식'과 '석식' 메뉴만 각각 추출하고, 메뉴 옆에 붙은 괄호 속 알레르기 유발 물질 번호(예: 1.2.5.6)는 모두 제거한 뒤 깔끔한 문자열 배열로 반환해 줘. 만약 날짜에 해당하는 정보가 없다면 빈 배열을 반환해.\\n\\nRaw Text:\\n\${text.substring(0, 50000)}\`,`;

content = content.replace(promptSearch, promptReplace);

const pdfEndpoint = `
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

  app.post("/api/refine-meal-text",`;

content = content.replace('app.post("/api/refine-meal-text",', pdfEndpoint);

fs.writeFileSync('server.ts', content);
