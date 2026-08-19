const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const replacement = `if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error || "API 요청 실패";
          if (res.status === 503 || errMsg.includes('high demand') || errMsg.includes('503')) {
            throw new Error("AI 모델 요청량이 많아 일시적으로 지연되고 있습니다. 잠시 후 다시 시도해 주세요.");
          }
          throw new Error(errMsg);
        }`;

content = content.replace(/if \(!res\.ok\) throw new Error\("API 요청 실패"\);/g, replacement);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
