import re

with open("src/App.tsx", "r") as f:
    content = f.read()

bad_str = """              <div className="space-y-2 mt-4">
                <label className="text-xs font-bold text-slate-400">학교명 (UI 표시용)</label>"""

good_str = """                <label className="text-xs font-bold text-slate-400">학교명 (UI 표시용)</label>"""

content = content.replace(bad_str, good_str)

with open("src/App.tsx", "w") as f:
    f.write(content)
