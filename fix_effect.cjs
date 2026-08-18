const fs = require('fs');
let content = fs.readFileSync('src/components/OfficeRemote.tsx', 'utf8');

const target = "const [location, setLocation] = useState<string>(state.location || '교무실');";

const effectLogic = `
  const availableGrades = Object.keys(structure).sort((a, b) => parseInt(a) - parseInt(b));
  const availableClasses = structure[grade] || [];

  useEffect(() => {
    if (!isStructureLoading && availableGrades.length > 0) {
      if (!availableGrades.includes(grade)) {
        setGrade(availableGrades[0]);
      } else if (availableClasses.length > 0 && !availableClasses.includes(classNm)) {
        setClassNm(availableClasses[0]);
      }
    }
  }, [structure, grade, classNm, isStructureLoading, availableGrades, availableClasses]);
`;

content = content.replace(target, target + "\\n" + effectLogic);

fs.writeFileSync('src/components/OfficeRemote.tsx', content);
