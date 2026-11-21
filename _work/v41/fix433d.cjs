const fs = require('fs');
let s = fs.readFileSync('_work/v41/p433.txt', 'utf8');
const from = "o[akeys[1]] = [2, num(1)]; o[akeys[2]] = [2, num(0)];";
const to = "o[akeys[1]] = B.REP(num(1), [4, '0']); o[akeys[2]] = B.REP(num(0), [4, '0']);";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p433.txt', s.replace(from, to));
console.log('literal inputs wrapped');