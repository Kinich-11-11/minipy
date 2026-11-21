const fs = require('fs');
let s = fs.readFileSync('_work/v41/p335.txt', 'utf8');
const from = "      callProc('eval %s %s', [ADD(VAR('mzeq'), num(1)), argOf('hi')]),\n      callProc('unpackto %s %s', [VAR('mznm'), VAR('ev')]),";
const to = [
  "      callProc('log %s', [JOIN(txt('PZ92 meq='), VAR('mzeq'))]),",
  "      callProc('log %s', [JOIN(txt('PZ92 names='), VAR('mznm'))]),",
  "      callProc('log %s', [JOIN(txt('PZ92 n='), VAR('mzn'))]),",
  "      callProc('eval %s %s', [ADD(VAR('mzeq'), num(1)), argOf('hi')]),",
  "      callProc('log %s', [JOIN(txt('PZ92 evtype='), VAR('evtype'))]),",
  "      callProc('log %s', [JOIN(txt('PZ92 ev='), VAR('ev'))]),",
  "      callProc('unpackto %s %s', [VAR('mznm'), VAR('ev')]),"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p335.txt', s.replace(from, to));
console.log('probe added');