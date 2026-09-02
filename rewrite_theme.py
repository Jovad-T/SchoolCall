import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# Add theme setting to schoolConfig initial state
content = content.replace(
    "currentClass: parsed.currentClass || 0,",
    "currentClass: parsed.currentClass || 0,\n      classroomTheme: parsed.classroomTheme || 'default',"
)

# Add adminTheme state
content = content.replace(
    "const [adminPinInput, setAdminPinInput] = useState(schoolConfig.adminPin);",
    "const [adminPinInput, setAdminPinInput] = useState(schoolConfig.adminPin);\n  const [adminClassroomTheme, setAdminClassroomTheme] = useState(schoolConfig.classroomTheme || 'default');"
)

# Update sync in pin modal verify
content = content.replace(
    "setAdminNeisApiKey(schoolConfig.neisApiKey);",
    "setAdminNeisApiKey(schoolConfig.neisApiKey);\n      setAdminClassroomTheme(schoolConfig.classroomTheme || 'default');"
)

# Add UI in Admin mode
admin_ui = """              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">교실 화면 테마 (색감)</label>
                <select 
                  value={adminClassroomTheme}
                  onChange={e => setAdminClassroomTheme(e.target.value)}
                  className="w-full px-4 py-3 bg-[#111a15] text-white rounded-xl border border-emerald-900 text-sm focus:border-emerald-500 outline-none"
                >
                  <option value="default">기본 (그린/에메랄드)</option>
                  <option value="dark">다크 모드 (어두운 회색/블랙)</option>
                  <option value="light">라이트 모드 (화이트/밝은 파랑)</option>
                </select>
              </div>"""

content = content.replace(
    """<label className="text-xs font-bold text-slate-400">학교명 (UI 표시용)</label>""",
    admin_ui + """\n              <div className="space-y-2 mt-4">\n                <label className="text-xs font-bold text-slate-400">학교명 (UI 표시용)</label>"""
)

# Add it to the saved config payload
content = content.replace(
    "popupTimeout: adminPopupTimeout",
    "popupTimeout: adminPopupTimeout,\n      classroomTheme: adminClassroomTheme"
)

with open("src/App.tsx", "w") as f:
    f.write(content)
