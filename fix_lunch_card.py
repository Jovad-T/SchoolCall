import re

with open("src/App.tsx", "r") as f:
    content = f.read()

replacements = [
    (
        '<Utensils size={20} className="text-emerald-400" />\n            <h2 className="text-base font-bold text-emerald-200">오늘의 급식</h2>',
        '<Utensils size={20} className={th.sectionIcon} />\n            <h2 className={`text-base font-bold ${th.sectionTitle}`}>오늘의 급식</h2>'
    ),
    (
        '<div className="bg-[#112017] rounded-3xl p-6 border border-emerald-900/30 shadow-xl flex flex-col relative overflow-hidden group">',
        '<div className={`rounded-3xl p-6 border shadow-xl flex flex-col relative overflow-hidden group ${th.tableHeader}`}>'
    )
]

for old, new in replacements:
    content = content.replace(old, new)

with open("src/App.tsx", "w") as f:
    f.write(content)

