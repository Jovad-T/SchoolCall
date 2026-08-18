const fs = require('fs');
let content = fs.readFileSync('src/components/ClassroomDisplay.tsx', 'utf8');

content = content.replace(
  "import { useCallState, CallState, useClassAnnouncement } from '../lib/store';",
  "import { useCallState, CallState, useClassAnnouncement, useClassTimetable } from '../lib/store';"
);

content = content.replace(
  "const { announcement, updateAnnouncement } = useClassAnnouncement(settings?.grade || '', settings?.classNm || '');",
  "const { announcement, updateAnnouncement } = useClassAnnouncement(settings?.grade || '', settings?.classNm || '');\n  const { customTimetable } = useClassTimetable(settings?.grade || '', settings?.classNm || '');"
);

content = content.replace(
  "const [timetable, setTimetable] = useState<string[]>([]);",
  "const [neisTimetable, setNeisTimetable] = useState<string[]>([]);\n  const [timetable, setTimetable] = useState<string[]>([]);"
);

content = content.replace(
  "setTimetable(rows.map((r: any) => r.ITRT_CNTNT));",
  "setNeisTimetable(rows.map((r: any) => r.ITRT_CNTNT));"
);

content = content.replace(
  "          setTimetable([]);",
  "          setNeisTimetable([]);"
);

const effectCode = `
  useEffect(() => {
    const dayOfWeek = currentTime.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5 && customTimetable && customTimetable[dayOfWeek.toString()]) {
      const customDayTt = customTimetable[dayOfWeek.toString()].filter((sub: string) => sub.trim() !== '');
      if (customDayTt.length > 0) {
        setTimetable(customDayTt);
        return;
      }
    }
    setTimetable(neisTimetable);
  }, [neisTimetable, customTimetable, currentTime]);
`;

content = content.replace(
  "const timeString = currentTime.toLocaleTimeString('en-US', {",
  effectCode.trim() + "\n\n  const timeString = currentTime.toLocaleTimeString('en-US', {"
);

fs.writeFileSync('src/components/ClassroomDisplay.tsx', content);
