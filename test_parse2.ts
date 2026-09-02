function cleanSubj(val: string) {
    if (!val) return "-";
    let s = String(val).trim();
    s = s.split('/')[0].split('(')[0];
    s = s.replace(/^[A-Z](?=[가-힣])/, '');
    s = s.trim();
    return s || "-";
}
console.log(cleanSubj("C세포와물질대사"));
console.log(cleanSubj("국어/홍길동"));
console.log(cleanSubj("수학(A)"));
console.log(cleanSubj("B미술감상"));
