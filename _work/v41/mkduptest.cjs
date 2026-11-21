const fs = require('fs');
let s = fs.readFileSync('_work/v41/assemble.cjs', 'utf8');
const from = "'p261.txt',";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, "'p261.txt','p246.txt',");
s = s.replace(/build41\.js/g, '_builddup.js');
fs.writeFileSync('_work/v41/_duptest.cjs', s);
console.log('dup test file written');
