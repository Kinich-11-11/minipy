const fs = require('fs');
const p = '_work/v41/p266.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "    setV('mpbin', num(0)),\n    callProc('eval %s %s', [firstLo, firstHi]),";
const to = [
  "    setV('mpbin', num(0)),",
  "    callProc('fail %s', [JOIN(txt('PZ54 flo='), JOIN(firstLo, JOIN(txt(' fhi='), JOIN(firstHi, JOIN(txt(' tlo=['), JOIN(item('Tok', firstLo), JOIN(txt('] thi=['), JOIN(item('Tok', firstHi), txt(']')))))))))]),",
  "    callProc('eval %s %s', [firstLo, firstHi]),"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
