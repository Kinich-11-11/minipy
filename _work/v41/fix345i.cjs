const fs = require('fs');
const lines = fs.readFileSync('_work/v41/p345.txt', 'utf8').split('\n');
const seen = new Set();
const out = [];
let dropped = 0;
for (const l of lines) {
  const key = l.trim().startsWith('const LOGX') ? 'LOGX' : (l.trim().startsWith('const JX') ? 'JX' : null);
  if (key) { if (seen.has(key)) { dropped++; continue; } seen.add(key); }
  out.push(l);
}
fs.writeFileSync('_work/v41/p345.txt', out.join('\n'));
console.log('dropped ' + dropped + ' duplicate helper line(s)');