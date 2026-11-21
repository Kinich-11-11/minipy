const fs = require('fs');
let s = fs.readFileSync('_work/v41/p431.txt', 'utf8');
s = s.replace("if (v[0] === 12) { if (typeof v[2] === 'string') out.push(v[2]); return; }",
              "if (v[0] === 12) { if (typeof v[2] === 'string') out.push(v[2]); if (typeof v[1] === 'string') out.push(v[1]); return; }");
fs.writeFileSync('_work/v41/p431.txt', s);
console.log('match either slot');