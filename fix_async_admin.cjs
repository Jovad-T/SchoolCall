const fs = require('fs');
let adminContent = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

adminContent = adminContent.replace(
  "  const handleManualSubmit = () => {",
  "  const handleManualSubmit = async () => {"
);
adminContent = adminContent.replace(
  "    parseAndSaveStudents(manualCsvText);",
  "    await parseAndSaveStudents(manualCsvText);"
);

adminContent = adminContent.replace(
  "    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {",
  "    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {"
);
adminContent = adminContent.replace(
  "        parseAndSaveStudents(event.target.result as string);",
  "        await parseAndSaveStudents(event.target.result as string);"
);
adminContent = adminContent.replace(
  "    reader.onload = (event) => {",
  "    reader.onload = async (event) => {"
);


fs.writeFileSync('src/components/AdminDashboard.tsx', adminContent);
