const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(/import pdfParse from "pdf-parse\/lib\/pdf-parse\.js";/g, 'import pdfParse from "pdf-parse";');
content = content.replace(/import { GoogleGenAI, Type } from "@google\/genai";/g, 'import { GoogleGenAI, Type } from "@google/genai";\nimport { createRequire } from "module";\nconst require = createRequire(import.meta.url);\nconst pdfParse = require("pdf-parse");');
content = content.replace(/import pdfParse from "pdf-parse";\n/g, '');
fs.writeFileSync('server.ts', content);
