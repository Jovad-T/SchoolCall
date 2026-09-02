import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# Generate the theme map
theme_js = """
  const th = (() => {
    const t = schoolConfig.classroomTheme || 'default';
    if (t === 'light') {
      return {
        mainBg: 'bg-slate-50', mainBorder: 'border-slate-300', textMain: 'text-slate-800',
        headerBg: 'bg-white', headerBorder: 'border-slate-200', 
        homeBtn: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300',
        schoolName: 'text-blue-600',
        title: 'text-slate-800',
        timeText: 'text-slate-800', dateText: 'text-blue-600',
        sectionBg: 'bg-white', sectionBorder: 'border-slate-200 shadow-md',
        sectionIcon: 'text-blue-500', sectionTitle: 'text-blue-700',
        tableHeader: 'bg-slate-100 border-slate-200 text-slate-700',
        tableRow: 'border-slate-200 text-slate-800',
        tableRowHover: 'hover:bg-slate-50',
        periodText: 'text-slate-500', subjectText: 'text-slate-900',
        mealBoxBg: 'bg-slate-50', mealBoxBorder: 'border-slate-200',
        mealTitle: 'text-slate-700', mealText: 'text-slate-600',
      };
    } else if (t === 'dark') {
      return {
        mainBg: 'bg-[#0a0a0a]', mainBorder: 'border-[#1a1a1a]', textMain: 'text-white',
        headerBg: 'bg-[#111]', headerBorder: 'border-[#222]', 
        homeBtn: 'bg-[#222] hover:bg-[#333] text-slate-300 border-[#333]',
        schoolName: 'text-slate-400',
        title: 'text-white',
        timeText: 'text-slate-100', dateText: 'text-slate-400',
        sectionBg: 'bg-[#111]', sectionBorder: 'border-[#222]',
        sectionIcon: 'text-slate-300', sectionTitle: 'text-slate-300',
        tableHeader: 'bg-[#1a1a1a] border-[#222] text-slate-300',
        tableRow: 'border-[#222] text-slate-300',
        tableRowHover: 'hover:bg-[#1a1a1a]',
        periodText: 'text-slate-500', subjectText: 'text-slate-100',
        mealBoxBg: 'bg-[#151515]', mealBoxBorder: 'border-[#222]',
        mealTitle: 'text-slate-400', mealText: 'text-slate-300',
      };
    } else {
      return {
        mainBg: 'bg-[#1e382b]', mainBorder: 'border-[#2b4c3b]', textMain: 'text-white',
        headerBg: 'bg-[#162d22]/60', headerBorder: 'border-emerald-900/60', 
        homeBtn: 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border-emerald-800',
        schoolName: 'text-emerald-400',
        title: 'text-white',
        timeText: 'text-emerald-50', dateText: 'text-emerald-400',
        sectionBg: 'bg-[#162d22]/40', sectionBorder: 'border-emerald-900/40 shadow-sm',
        sectionIcon: 'text-emerald-400', sectionTitle: 'text-emerald-300',
        tableHeader: 'bg-[#112017] border-emerald-900 text-emerald-200',
        tableRow: 'border-emerald-900/50 text-emerald-100',
        tableRowHover: 'hover:bg-[#112017]/50',
        periodText: 'text-emerald-600', subjectText: 'text-white',
        mealBoxBg: 'bg-[#162d22]/80', mealBoxBorder: 'border-emerald-900/60',
        mealTitle: 'text-emerald-400', mealText: 'text-emerald-200',
      };
    }
  })();
"""

# Find the start of classroom mode return
# return (
#   <div 
#     className="h-screen w-full bg-[#1e382b] text-white font-sans flex flex-col select-none overflow-hidden relative shadow-2xl border-4 border-[#2b4c3b]"
#     style={{ WebkitAppRegion: 'drag' } as any}
#   >

content = content.replace("  return (\n    <div \n      className=\"h-screen w-full bg-[#1e382b] text-white font-sans flex flex-col select-none overflow-hidden relative shadow-2xl border-4 border-[#2b4c3b]\"\n      style={{ WebkitAppRegion: 'drag' } as any}\n    >",
theme_js + """  return (
    <div 
      className={`h-screen w-full font-sans flex flex-col select-none overflow-hidden relative shadow-2xl border-4 ${th.mainBg} ${th.textMain} ${th.mainBorder}`}
      style={{ WebkitAppRegion: 'drag' } as any}
    >""")


replacements = [
    # Header
    (
        '<header className="h-20 px-8 flex items-center justify-between border-b border-emerald-900/60 bg-[#162d22]/60 shrink-0">',
        '<header className={`h-20 px-8 flex items-center justify-between border-b shrink-0 ${th.headerBg} ${th.headerBorder}`}>'
    ),
    (
        'className="px-3 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 text-xs font-bold border border-emerald-800 cursor-pointer"',
        'className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${th.homeBtn}`}'
    ),
    (
        '<span className="text-xs text-emerald-400 font-medium tracking-wider">{schoolConfig.schoolName}</span>',
        '<span className={`text-xs font-medium tracking-wider ${th.schoolName}`}>{schoolConfig.schoolName}</span>'
    ),
    (
        '<h1 className="text-2xl font-black tracking-tight text-white drop-shadow-md">{schoolConfig.currentGrade}학년 {schoolConfig.currentClass}반 알림판</h1>',
        '<h1 className={`text-2xl font-black tracking-tight drop-shadow-md ${th.title}`}>{schoolConfig.currentGrade}학년 {schoolConfig.currentClass}반 알림판</h1>'
    ),
    (
        '<div className="text-5xl font-black tracking-widest text-emerald-50 font-mono mb-1 drop-shadow-sm">{timeString}</div>',
        '<div className={`text-5xl font-black tracking-widest font-mono mb-1 drop-shadow-sm ${th.timeText}`}>{timeString}</div>'
    ),
    (
        '<div className="text-sm text-emerald-400 font-semibold tracking-wide">{dateString}</div>',
        '<div className={`text-sm font-semibold tracking-wide ${th.dateText}`}>{dateString}</div>'
    ),
    (
        '<section className="col-span-7 flex flex-col bg-[#162d22]/40 rounded-3xl p-6 border border-emerald-900/40 shadow-sm h-full">',
        '<section className={`col-span-7 flex flex-col rounded-3xl p-6 border h-full ${th.sectionBg} ${th.sectionBorder}`}>'
    ),
    (
        '<section className="col-span-5 flex flex-col bg-[#162d22]/40 rounded-3xl p-6 border border-emerald-900/40 shadow-sm h-full overflow-hidden">',
        '<section className={`col-span-5 flex flex-col rounded-3xl p-6 border h-full overflow-hidden ${th.sectionBg} ${th.sectionBorder}`}>'
    ),
    (
        '<BookOpen size={20} className="text-emerald-400" />\n              <h2 className="text-lg font-black text-emerald-300 tracking-wide">TODAY\'S SCHEDULE</h2>',
        '<BookOpen size={20} className={th.sectionIcon} />\n              <h2 className={`text-lg font-black tracking-wide ${th.sectionTitle}`}>TODAY\'S SCHEDULE</h2>'
    ),
    (
        '<Utensils size={20} className="text-emerald-400" />\n              <h2 className="text-lg font-black text-emerald-300 tracking-wide">TODAY\'S MEALS</h2>',
        '<Utensils size={20} className={th.sectionIcon} />\n              <h2 className={`text-lg font-black tracking-wide ${th.sectionTitle}`}>TODAY\'S MEALS</h2>'
    ),
    (
        '<div className="bg-[#112017] border-b border-emerald-900 grid grid-cols-[80px_1fr] p-3 text-xs font-bold text-emerald-200">',
        '<div className={`border-b grid grid-cols-[80px_1fr] p-3 text-xs font-bold ${th.tableHeader}`}>'
    ),
    (
        'className="grid grid-cols-[80px_1fr] border-b border-emerald-900/50 hover:bg-[#112017]/50 transition-colors"',
        'className={`grid grid-cols-[80px_1fr] border-b transition-colors ${th.tableRow} ${th.tableRowHover}`}'
    ),
    (
        '<div className="text-emerald-600 font-black p-4 text-center">',
        '<div className={`font-black p-4 text-center ${th.periodText}`}>'
    ),
    (
        '<div className="text-white font-bold p-4 text-lg">',
        '<div className={`font-bold p-4 text-lg ${th.subjectText}`}>'
    ),
    (
        '<div className="flex-1 bg-[#162d22]/80 border border-emerald-900/60 rounded-2xl p-5 overflow-y-auto">',
        '<div className={`flex-1 rounded-2xl p-5 border overflow-y-auto ${th.mealBoxBg} ${th.mealBoxBorder}`}>'
    ),
    (
        '<h3 className="text-emerald-400 font-bold mb-3 border-b border-emerald-900/50 pb-2 flex items-center gap-2">',
        '<h3 className={`font-bold mb-3 border-b border-emerald-900/50 pb-2 flex items-center gap-2 ${th.mealTitle}`}>'
    ),
    (
        '<div className="text-emerald-200 text-sm leading-loose whitespace-pre-wrap font-medium">',
        '<div className={`text-sm leading-loose whitespace-pre-wrap font-medium ${th.mealText}`}>'
    )
]

for old, new in replacements:
    content = content.replace(old, new)

with open("src/App.tsx", "w") as f:
    f.write(content)

