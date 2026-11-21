const fs = require('fs');
const p = '_work/v41/p267.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "    setV('mpbin', num(0)),\n    callProc('eval %s %s', [firstLo, firstHi]),";
const to = [
  "    setV('mpbin', num(0)),",
  "    callProc('fail %s', [JOIN(txt('PZ56 flo='), JOIN(firstLo, JOIN(txt(' fhi='), JOIN(firstHi, JOIN(txt(' lo=['), JOIN(item('Tok', firstLo), JOIN(txt('] hi=['), JOIN(item('Tok', firstHi), JOIN(txt('] cut='), JOIN(VAR('mpcut'), txt(']')))))))))))]),",
  "    callProc('eval %s %s', [firstLo, firstHi]),"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
