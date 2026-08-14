const fs = require('fs');
let content = fs.readFileSync('src/components/ClassroomDisplay.tsx', 'utf8');

// Remove Return button block
content = content.replace(/\s*\{\/\* Return button \*\/\}\s*<button\s+onClick=\{\(\) => navigate\('\/'\)\}[\s\S]*?<\/button>/, '');

// Remove navigate initialization
content = content.replace(/\s*const navigate = useNavigate\(\);/, '');

// Remove Home import
content = content.replace('Settings, Home, CheckCircle', 'Settings, CheckCircle');

// Check if useNavigate is imported and remove it if possible
content = content.replace(/import \{ useNavigate \} from 'react-router-dom';\n?/, '');

fs.writeFileSync('src/components/ClassroomDisplay.tsx', content);
