const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');
content = content.replace(/My Google AI Studio App/g, '학교 호출 시스템');
fs.writeFileSync('index.html', content);
