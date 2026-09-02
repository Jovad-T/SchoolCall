const data = [
  ["", "1반", "", "", "", "", "2반"],
  ["", "월", "화", "수", "목", "금", "월", "화", "수", "목", "금"],
  ["1", "국어", "수학", "영어", "과학", "사회", "체육", "미술", "음악", "역사", "국어"],
  ["2", "수학", "국어", "과학", "영어", "사회", "미술", "체육", "음악", "역사", "영어"]
];

function findTimetableBlocks(data: any[][], defaultGrade: string) {
    const blocks: any[] = [];
    
    for (let r = 0; r < data.length; r++) {
        const row = data[r];
        if (!row) continue;
        
        for (let c = 0; c < row.length; c++) {
            if (row[c] === '월') {
                // Check if it's a Mon-Fri sequence
                if (row[c+1] === '화' && row[c+2] === '수' && row[c+3] === '목' && row[c+4] === '금') {
                    // It's a block! Find the class name above it.
                    let className = '';
                    for (let searchRow = Math.max(0, r - 3); searchRow < r; searchRow++) {
                        // search around c to c+4
                        for (let searchCol = Math.max(0, c - 2); searchCol <= c + 4; searchCol++) {
                            const val = String(data[searchRow][searchCol] || '').trim();
                            if (val.match(/^[0-9]+반$/) || val.match(/^[0-9]+-[0-9]+$/) || val.match(/^[0-9]+학년\s*[0-9]+반$/)) {
                                className = val;
                            }
                        }
                    }
                    blocks.push({ r, c, className });
                }
            }
        }
    }
    return blocks;
}
console.log(findTimetableBlocks(data, "1"));
