const fs = require('fs');
let content = fs.readFileSync('src/components/ClassroomDisplay.tsx', 'utf8');

content = content.replace("              </motion.div>\\n              \\n              <motion.div ", "              </motion.h2>\\n              \\n              <motion.div ");

fs.writeFileSync('src/components/ClassroomDisplay.tsx', content);
