const fs = require('fs');
let content = fs.readFileSync('src/components/ClassroomDisplay.tsx', 'utf8');

const searchStr = `
              </motion.div>
              
              <motion.div 
                className="bg-black/80 px-12`;
const repStr = `
              </motion.h2>
              
              <motion.div 
                className="bg-black/80 px-12`;
content = content.replace(searchStr, repStr);
fs.writeFileSync('src/components/ClassroomDisplay.tsx', content);
