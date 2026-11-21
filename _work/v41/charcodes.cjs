const fs = require('fs');
const files = ['_work/v41/p228.txt', '_work/v41/p226.txt', '_work/v41/p227.txt'];
const pats = ["txt('(')", "txt('[')", "txt(')')", "txt(']')", "txt(',')", "txt('{')", "txt('}')"];
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const out = [];
  for (const p of pats) {
    const i = s.indexOf(p);
    if (i < 0) { out.push(p + '=absent'); continue; }
    const ch = s[i + 5];
    out.push(p + '=U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'));
  }
  console.log(f + ': ' + out.join('  '));
}
// how does the *language* store a "(" literal?  compare with a known-good project block
const p = JSON.parse(fs.readFileSync('_work/v41/_p228proj.json', 'utf8'));
const B = p.targets.find((t) => t.name === 'Interpreter').blocks;
let found = 0;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode === 'operator_equals' && b.inputs.OPERAND2) {
    const v = b.inputs.OPERAND2;
    const lit = Array.isArray(v[1]) ? v[1][1] : v[1];
    if (typeof lit === 'string' && lit.length === 1 && '([{)]},'.includes(lit)) {
      console.log('eq block ' + id + ' OP2=' + JSON.stringify(v) + ' codes=' +
        [...String(lit)].map((c) => c.codePointAt(0).toString(16)).join(','));
      if (++found > 3) break;
    }
  }
}
