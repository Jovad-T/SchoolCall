const fs = require('fs');
const filePath = 'src/components/ClassroomDisplay.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const formatFn = `
const formatSubjectName = (name: string) => {
  if (!name) return name;
  let formatted = name;
  
  // 1. 공통 접속사 "와/과" 뒤에 띄어쓰기
  formatted = formatted.replace(/(독서와|미술과|역학과|세포와|화학과|물리와|생명과학과|지구과학과|수학과|기하와|경제와|사회와|윤리와|인간과|생활과|문학과|언어와|매체와|화법과|확률과)(?=[가-힣])/g, '$1 ');

  // 2. 어학 관련
  formatted = formatted.replace(/(프랑스어|독일어|스페인어|중국어|일본어|러시아어|아랍어|베트남어|영어|한국어)(회화|독해|작문|문법|문화)/g, '$1 $2');
  
  // 3. 특정 단어 조합
  formatted = formatted.replace(/스포츠과학/g, '스포츠 과학');
  formatted = formatted.replace(/미술감상과비평/g, '미술감상과 비평');
  formatted = formatted.replace(/음악감상과비평/g, '음악감상과 비평');
  formatted = formatted.replace(/고전과윤리/g, '고전과 윤리');
  formatted = formatted.replace(/여행지리/g, '여행 지리');
  
  formatted = formatted.replace(/\\s+/g, ' ').trim();
  return formatted;
};
`;

if (!content.includes('const formatSubjectName')) {
  // Insert before the default export or const ClassroomDisplay
  content = content.replace('export default function ClassroomDisplay', formatFn + '\nexport default function ClassroomDisplay');
}

const oldSpan = '<span className="text-xl md:text-2xl font-black tracking-tighter text-[#111]">{subject}</span>';
const newSpan = '<span className="text-xl md:text-2xl font-black tracking-tight text-center leading-tight break-keep text-[#111]">{formatSubjectName(subject)}</span>';

if (content.includes(oldSpan)) {
  content = content.replace(oldSpan, newSpan);
} else {
  console.log("Could not find old span. Try regex.");
  content = content.replace(/<span className="text-xl md:text-2xl font-black tracking-tighter text-\[\#111\]">\{subject\}<\/span>/, newSpan);
}

fs.writeFileSync(filePath, content);
console.log("Patched ClassroomDisplay.tsx successfully.");
