const fs = require('fs');
let s = fs.readFileSync('_work/v41/p419.txt', 'utf8');
const from = "BB[strIf].inputs.CONDITION = B.REP(AND(EQ(VAR('evtype'), txt('O')), OR(hasOf('__str__'), hasOf('__repr__'))), [2, '']);";
const to = "BB[strIf].inputs.CONDITION = [2, AND(EQ(VAR('evtype'), txt('O')), OR(hasOf('__str__'), hasOf('__repr__')))];";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p419.txt', s.replace(from, to));
console.log('condition shape fixed');