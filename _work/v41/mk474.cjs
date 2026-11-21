const fs = require('fs');
let s = fs.readFileSync('_work/v41/p471.txt', 'utf8');
const from = "    const msg = I('operator_join', {\n      inputs: { STRING1: B.REP(txt('FAIL ' + id + ' :: '), [10, '']), STRING2: arg }\n    });";
const to = "    const msg = JOIN(JOIN(txt('FAIL ' + id + ' :: '), arg), JOIN(JOIN(txt(' | pc='), VAR('pc')), JOIN(JOIN(txt(' fi='), VAR('fi')), JOIN(JOIN(txt(' head=['), VAR('head')), JOIN(txt('] count='), VAR('count'))))));";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p474.txt', s.replace(from, to).split('P471').join('P474'));
console.log('p474 written');