const fs = require('fs');
const p = '_work/v41/p246.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "  setV('xgsep', txt('\\n'))";
const to = "  setV('xgsep', txt(' '))";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
