const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const newUploadLogic = `  const handleMealImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("파일 크기는 10MB 이하여야 합니다.");
      return;
    }

    setIsExtractingMeal(true);
    let text = '';

    try {
      if (file.type === 'application/pdf') {
        setMealStatus("PDF 파일에서 텍스트를 추출하고 있습니다...");
        const base64Str = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });
        
        const base64Data = base64Str.split(',')[1];
        
        const pdfRes = await fetch('/api/extract-pdf-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64: base64Data })
        });
        
        if (!pdfRes.ok) throw new Error("PDF 텍스트 추출 실패");
        const pdfData = await pdfRes.json();
        text = pdfData.text;
      } else {
        setMealStatus("Tesseract OCR로 이미지 속 한글을 인식하고 있습니다...");
        const worker = await Tesseract.createWorker('kor', 1, {
          logger: m => {
            if (m.status === 'recognizing text') {
              setMealStatus(\`OCR 인식 중... \${Math.round(m.progress * 100)}%\`);
            }
          }
        });
        const { data: { text: ocrText } } = await worker.recognize(file);
        text = ocrText;
        await worker.terminate();
      }

      if (!text || text.trim() === '') {
        throw new Error("글자를 인식하지 못했습니다.");
      }

      // 2. Refine using AI API/IPC
      setMealStatus("AI가 인식된 텍스트를 식단표 형식으로 정제하고 있습니다...");
      let data;
      if (typeof window !== 'undefined' && (window as any).electron?.invoke) {`;

content = content.replace(/const handleMealImageUpload = async \([\s\S]*?if \(typeof window !== 'undefined' && \(window as any\)\.electron\?\.invoke\) \{/, newUploadLogic);

// Replace accept attribute
content = content.replace('accept="image/*"\n                  onChange={handleMealImageUpload}', 'accept="image/*,application/pdf"\n                  onChange={handleMealImageUpload}');
content = content.replace('식단표 이미지 첨부 및 OCR 추출', '식단표 이미지/PDF 첨부 및 추출');

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
