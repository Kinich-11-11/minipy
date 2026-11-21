const fs = require('fs');
let s = fs.readFileSync('_work/v41/p331.txt', 'utf8');
const map = { mcom: 'mzcom', meq: 'mzeq', md: 'mzd', mi: 'mzi', mc: 'mzc', mn: 'mzn', mnames: 'mznm', mk: 'mzk', mlo: 'mzlo', mhi: 'mzhi', mfound: 'mzfd' };
for (const [a, b] of Object.entries(map)) {
  s = s.split("'" + a + "'").join("'" + b + "'");
}
fs.writeFileSync('_work/v41/p331.txt', s);
console.log('renamed locals');