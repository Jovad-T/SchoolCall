import re

with open("src/App.tsx", "r") as f:
    content = f.read()

replacements = [
    (
        '<BookOpen size={20} className="text-emerald-400" />\n              <h2 className="text-base font-bold text-emerald-200">오늘의 시간표</h2>',
        '<BookOpen size={20} className={th.sectionIcon} />\n              <h2 className={`text-base font-bold ${th.sectionTitle}`}>오늘의 시간표</h2>'
    ),
    (
        '<Utensils size={20} className="text-emerald-400" />\n              <h2 className="text-base font-bold text-emerald-200">오늘의 급식</h2>',
        '<Utensils size={20} className={th.sectionIcon} />\n              <h2 className={`text-base font-bold ${th.sectionTitle}`}>오늘의 급식</h2>'
    ),
    (
        '<span className="text-xs text-emerald-400/80 font-mono">1교시 {formatScheduleString(dailySchedule[1])}</span>',
        '<span className={`text-xs font-mono ${th.schoolName}`}>1교시 {formatScheduleString(dailySchedule[1])}</span>'
    )
]

for old, new in replacements:
    content = content.replace(old, new)

with open("src/App.tsx", "w") as f:
    f.write(content)

