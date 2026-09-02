import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Config interface
if "appinServerUrl?: string;" not in content:
    content = content.replace(
        "adminPin: string;",
        "adminPin: string;\n  appinServerUrl?: string;"
    )

# 2. Initial state
content = content.replace(
    "classroomTheme: parsed.classroomTheme || 'default',",
    "classroomTheme: parsed.classroomTheme || 'default',\n      appinServerUrl: parsed.appinServerUrl || '',"
)

# 3. Admin state
content = content.replace(
    "const [adminClassroomTheme, setAdminClassroomTheme] = useState(schoolConfig.classroomTheme || 'default');",
    "const [adminClassroomTheme, setAdminClassroomTheme] = useState(schoolConfig.classroomTheme || 'default');\n  const [adminAppinServerUrl, setAdminAppinServerUrl] = useState(schoolConfig.appinServerUrl || '');"
)

# 4. Sync on verify
content = content.replace(
    "setAdminClassroomTheme(schoolConfig.classroomTheme || 'default');",
    "setAdminClassroomTheme(schoolConfig.classroomTheme || 'default');\n      setAdminAppinServerUrl(schoolConfig.appinServerUrl || '');"
)

# 5. Save config
content = content.replace(
    "classroomTheme: adminClassroomTheme",
    "classroomTheme: adminClassroomTheme,\n      appinServerUrl: adminAppinServerUrl"
)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)
