import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# School Name
old_school = """                <label className="text-xs font-bold text-slate-400">학교명 (UI 표시용)</label>
                <input 
                  type="text" 
                  value={adminSchoolName}
                  onChange={e => setAdminSchoolName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#111a15] text-white rounded-xl border border-emerald-900 text-sm focus:border-emerald-500 outline-none"
                  placeholder="예: 사직여자고등학교"
                />"""
new_school = """                <label className="text-xs font-bold text-slate-400">학교명 (UI 표시용)</label>
                <input 
                  type="text" 
                  value={adminSchoolName}
                  onChange={e => setAdminSchoolName(e.target.value)}
                  className={`w-full px-4 py-3 bg-[#111a15] text-white rounded-xl border text-sm outline-none transition-colors ${!isSchoolNameValid ? 'border-rose-500 focus:border-rose-400' : 'border-emerald-900 focus:border-emerald-500'}`}
                  placeholder="예: 사직여자고등학교"
                />
                {!isSchoolNameValid && <p className="text-[10px] text-rose-400 mt-1">학교명을 입력해주세요.</p>}"""
content = content.replace(old_school, new_school)

# Edu Code
old_edu = """              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">시도교육청 코드 (NEIS 급식용)</label>
                <input 
                  type="text" 
                  value={adminEduCode}
                  onChange={e => setAdminEduCode(e.target.value)}
                  className="w-full px-4 py-3 bg-[#111a15] text-white rounded-xl border border-emerald-900 text-sm focus:border-emerald-500 outline-none"
                  placeholder="예: C10, J10 등"
                />
              </div>"""
new_edu = """              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">시도교육청 코드 (NEIS 급식용)</label>
                <input 
                  type="text" 
                  value={adminEduCode}
                  onChange={e => setAdminEduCode(e.target.value)}
                  className={`w-full px-4 py-3 bg-[#111a15] text-white rounded-xl border text-sm outline-none transition-colors ${!isEduCodeValid ? 'border-rose-500 focus:border-rose-400' : 'border-emerald-900 focus:border-emerald-500'}`}
                  placeholder="예: C10, J10 등"
                />
                {!isEduCodeValid && <p className="text-[10px] text-rose-400">올바른 형식(예: J10)이 아닙니다.</p>}
              </div>"""
content = content.replace(old_edu, new_edu)

# School Code
old_scode = """              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">표준학교코드 (NEIS 급식용)</label>
                <input 
                  type="text" 
                  value={adminSchoolCode}
                  onChange={e => setAdminSchoolCode(e.target.value)}
                  className="w-full px-4 py-3 bg-[#111a15] text-white rounded-xl border border-emerald-900 text-sm focus:border-emerald-500 outline-none"
                  placeholder="예: 7150153"
                />
              </div>"""
new_scode = """              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">표준학교코드 (NEIS 급식용)</label>
                <input 
                  type="text" 
                  value={adminSchoolCode}
                  onChange={e => setAdminSchoolCode(e.target.value)}
                  className={`w-full px-4 py-3 bg-[#111a15] text-white rounded-xl border text-sm outline-none transition-colors ${!isSchoolCodeValid ? 'border-rose-500 focus:border-rose-400' : 'border-emerald-900 focus:border-emerald-500'}`}
                  placeholder="예: 7150153"
                />
                {!isSchoolCodeValid && <p className="text-[10px] text-rose-400">7~8자리 숫자 형식이어야 합니다.</p>}
              </div>"""
content = content.replace(old_scode, new_scode)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)

