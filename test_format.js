function formatSubjectName(name) {
  if (!name) return name;
  let formatted = name;
  
  // 1. 공통 접속사 "와/과" 뒤에 띄어쓰기 (단, 끝에 있거나 이미 띄어쓰기 된 경우 제외)
  // 예: "독서와작문", "미술과매체" -> "독서와 작문", "미술과 매체"
  // "역학과에너지" -> "역학과 에너지"
  formatted = formatted.replace(/(독서와|미술과|역학과|미술감상과|세포와|화학과|물리와|생명과학과|지구과학과|수학과|기하와|경제와|사회와|윤리와|인간과|생활과)(?=[가-힣])/g, '$1 ');

  // 2. 어학 관련
  formatted = formatted.replace(/(프랑스어|독일어|스페인어|중국어|일본어|러시아어|아랍어|베트남어|영어|한국어)(회화|독해|작문|문법|문화)/g, '$1 $2');
  
  // 3. 특정 단어 조합
  formatted = formatted.replace(/스포츠과학/g, '스포츠 과학');
  formatted = formatted.replace(/미술감상과비평/g, '미술감상과 비평');
  // 이미 띄어쓰기가 두 번 된 경우 방지 (replace 중복 적용 등)
  formatted = formatted.replace(/\s+/g, ' ').trim();
  
  return formatted;
}

const subjects = ["독서와작문", "스포츠과학", "역학과에너지", "프랑스어회화", "미술감상과비평", "세포와물질대사", "미술과매체", "생활과윤리", "중국어회화", "기하와벡터"];
subjects.forEach(s => console.log(s, "->", formatSubjectName(s)));
