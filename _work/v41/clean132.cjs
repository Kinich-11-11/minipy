const fs = require('fs');
const f = '_work/v41/p132.txt';
let t = fs.readFileSync(f, 'utf8');
t = t.replace("  const last = (l) => item(l, txt('last'));\n  B.addList(IT, 'DbgL', []);", "  const last = (l) => item(l, txt('last'));");
t = t.replace(/\n *addTo\('DbgL'[^\n]*\n/g, '\n');
fs.writeFileSync(f, t);
console.log('written ' + t.length + ' dbg=' + (t.includes('DbgL') ? 'yes' : 'no'));
