import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# NEIS API Key input
old_neis = """                <input 
                  type="password" 
                  value={adminNeisApiKey}
                  onChange={e => setAdminNeisApiKey(e.target.value)}
                  className="w-full px-4 py-3 bg-[#111a15] text-white rounded-xl border border-emerald-900 text-sm focus:border-emerald-500 outline-none"
                  placeholder="발급받은 NEIS API KEY 입력"
                />"""
new_neis = """                <input 
                  type="password" 
                  value={adminNeisApiKey}
                  onChange={e => setAdminNeisApiKey(e.target.value)}
                  className={`w-full px-4 py-3 bg-[#111a15] text-white rounded-xl border text-sm outline-none transition-colors ${!isNeisApiKeyValid ? 'border-rose-500 focus:border-rose-400' : 'border-emerald-900 focus:border-emerald-500'}`}
                  placeholder="발급받은 NEIS API KEY 입력"
                />
                {!isNeisApiKeyValid && <p className="text-[10px] text-rose-400 mt-1">32자리 영문/숫자 형식이어야 합니다.</p>}"""
content = content.replace(old_neis, new_neis)

# Gemini API Key input
old_gemini = """                  <input 
                    type="password" 
                    value={adminGeminiApiKey}
                    onChange={e => setAdminGeminiApiKey(e.target.value)}
                    className="flex-1 px-4 py-3 bg-[#111a15] text-white rounded-xl border border-emerald-900 text-sm focus:border-emerald-500 outline-none"
                    placeholder="발급받은 Google Gemini API KEY 입력"
                  />"""
new_gemini = """                  <div className="flex-1 flex flex-col gap-1">
                    <input 
                      type="password" 
                      value={adminGeminiApiKey}
                      onChange={e => setAdminGeminiApiKey(e.target.value)}
                      className={`w-full px-4 py-3 bg-[#111a15] text-white rounded-xl border text-sm outline-none transition-colors ${!isGeminiApiKeyValid ? 'border-rose-500 focus:border-rose-400' : 'border-emerald-900 focus:border-emerald-500'}`}
                      placeholder="발급받은 Google Gemini API KEY 입력"
                    />
                    {!isGeminiApiKeyValid && <p className="text-[10px] text-rose-400">키는 'AIza'로 시작해야 합니다.</p>}
                  </div>"""
content = content.replace(old_gemini, new_gemini)

# PIN input
old_pin = """              <input 
                type="password"
                maxLength={4}
                value={adminPinInput}
                onChange={e => setAdminPinInput(e.target.value)}
                placeholder="숫자 4자리"
                className="w-1/3 min-w-[120px] px-4 py-3 bg-[#111a15] text-white rounded-xl border border-emerald-900 text-sm text-center tracking-[0.5em] font-mono focus:border-amber-400 outline-none"
              />"""
new_pin = """              <input 
                type="password"
                maxLength={4}
                value={adminPinInput}
                onChange={e => setAdminPinInput(e.target.value)}
                placeholder="숫자 4자리"
                className={`w-1/3 min-w-[120px] px-4 py-3 bg-[#111a15] text-white rounded-xl border text-sm text-center tracking-[0.5em] font-mono outline-none transition-colors ${!isPinValid ? 'border-rose-500 focus:border-rose-400' : 'border-emerald-900 focus:border-amber-400'}`}
              />
              {!isPinValid && <p className="text-[10px] text-rose-400 mt-1">숫자 4자리를 정확히 입력해주세요.</p>}"""
content = content.replace(old_pin, new_pin)

# Appin URL input
old_appin = """                    <input
                      type="text"
                      value={adminAppinServerUrl}
                      onChange={e => setAdminAppinServerUrl(e.target.value)}
                      placeholder="예: 192.168.1.100/1053"
                      className="flex-1 px-4 py-2.5 bg-black/40 text-white rounded-xl border border-emerald-800 text-sm focus:border-emerald-500 outline-none"
                    />"""
new_appin = """                    <div className="flex-1 flex flex-col gap-1">
                      <input
                        type="text"
                        value={adminAppinServerUrl}
                        onChange={e => setAdminAppinServerUrl(e.target.value)}
                        placeholder="예: 192.168.1.100/1053"
                        className={`w-full px-4 py-2.5 bg-black/40 text-white rounded-xl border text-sm outline-none transition-colors ${!isAppinUrlValid ? 'border-rose-500 focus:border-rose-400' : 'border-emerald-800 focus:border-emerald-500'}`}
                      />
                      {!isAppinUrlValid && <p className="text-[10px] text-rose-400">올바른 IP/포트 또는 URL 형식이 아닙니다.</p>}
                    </div>"""
content = content.replace(old_appin, new_appin)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)

