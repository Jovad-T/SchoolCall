import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(
    r'(<button\s+onClick={handleClosePopupAndHide}[\s\S]*?확인 \(닫기\)\s*</button>\s*</div>\s*)</div>\s*</div>\s*\)}\s*</div>',
    r'\1</motion.div>\n          </motion.div>\n        )}\n      </AnimatePresence>\n    </div>',
    content
)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)

