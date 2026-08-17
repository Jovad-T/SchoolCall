const fs = require('fs');
let content = fs.readFileSync('src/lib/store.ts', 'utf8');

// Replace useRoster hook
const newUseRoster = `
export type Student = {
  id: string;
  name: string;
};

// 전역 상태 (단순화를 위해 모듈 스코프 변수와 이벤트 리스너 활용)
let globalStudents: Student[] = [];
try {
  const saved = localStorage.getItem('school_students_csv');
  if (saved) {
    globalStudents = JSON.parse(saved);
  }
} catch (e) {}

const listeners = new Set<() => void>();

export function setGlobalStudents(students: Student[]) {
  globalStudents = students;
  localStorage.setItem('school_students_csv', JSON.stringify(students));
  listeners.forEach(l => l());
}

export function useLocalRoster(grade: string, classNm: string) {
  const [roster, setRoster] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const update = () => {
      // id: e.g. '20801' -> grade 2, class 08, num 01
      const filtered = globalStudents.filter(s => {
        if (s.id.length >= 4) {
          const g = s.id[0];
          let c = s.id.substring(1, 3);
          if (c.startsWith('0')) c = c[1];
          return g === grade && c === classNm;
        }
        return false;
      }).map(s => \`\${parseInt(s.id.slice(-2))}번 \${s.name}\`);
      
      setRoster(filtered);
    };

    update();
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, [grade, classNm]);

  return { roster, isLoading };
}
`;

content = content.replace(/\/\/ 명단\(Roster\) 가져오는 훅 추가[\s\S]*$/, newUseRoster);

fs.writeFileSync('src/lib/store.ts', content);
