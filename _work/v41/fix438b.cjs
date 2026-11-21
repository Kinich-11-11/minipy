const fs = require('fs');
let s = fs.readFileSync('_work/v41/p438.txt', 'utf8');
const from = "        callProc('calluser %s %s %s', [VAR('cfull'), B.REP(num(1), [4, '0']), B.REP(num(0), [4, '0'])]),";
const to = "        callProc('calluser %s %s %s', [VAR('cfull'), B.REP(num(1), [4, '0']), B.REP(num(1), [4, '0'])]),   // 有效但无害的一格；值槽随后覆盖第 1 个实参";
if (!s.includes(from)) { console.log('MISS'); return; }
fs.writeFileSync('_work/v41/p438.txt', s.replace(from, to));
console.log('range changed to (1,1)');