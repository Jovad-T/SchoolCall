import re

with open("src/App.tsx", "r") as f:
    content = f.read()

replacements = [
    (
        '<span className="text-[10px] font-bold text-emerald-600/60 tracking-[0.2em]">LUNCH MENU</span>',
        '<span className={`text-[10px] font-bold tracking-[0.2em] ${th.periodText}`}>LUNCH MENU</span>'
    ),
    (
        '<span className="text-[10px] font-bold text-emerald-600/60 tracking-[0.2em]">DINNER MENU</span>',
        '<span className={`text-[10px] font-bold tracking-[0.2em] ${th.periodText}`}>DINNER MENU</span>'
    )
]

for old, new in replacements:
    content = content.replace(old, new)

with open("src/App.tsx", "w") as f:
    f.write(content)

