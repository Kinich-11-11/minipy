// around.cjs <project.json> <calleeProccode> : for every call to it, print the surrounding
// statement chain (so we can see which globals the caller reads after the call)
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const want = process.argv[3];
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const short = (b) => {
  const f = Object.entries(b.fields || {}).map(([k, v]) => k + '=' + JSON.stringify(v[0])).join(' ');
  const ins = Object.entries(b.inputs || {}).map(([k, v]) => {
    if (Array.isArray(v) && v[1] && v[1][0] === 12) return k + '=$' + v[1][1];
    if (Array.isArray(v) && (v[1] === undefined || typeof v[1] !== 'string')) return k + '=' + JSON.stringify(v[1]);
    if (Array.isArray(v) && typeof v[1] === 'string') {
      const t = B[v[1]];
      if (!t) return k + '=?';
      if (t.opcode === 'data_variable') return k + '=$' + t.fields.VARIABLE[0];
      if (t.opcode === 'procedures_call') return k + '=CALL ' + t.mutation.proccode.replace(/%s/g, '~');
      if (t.opcode === 'argument_reporter_string_number') return k + '=' + t.fields.VALUE[0];
      return k + '=' + t.opcode;
    }
    return k + '=?';
  }).join(', ');
  return b.opcode + ' ' + f + ' ' + ins;
};
let hits = 0;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_call' || !b.mutation || b.mutation.proccode !== want) continue;
  hits++;
  // walk to chain head
  let head = id;
  while (B[head] && B[head].parent && B[head].parent !== undefined) {
    const par = B[B[head].parent];
    if (!par) break;
    if (par.next === head || Object.values(par.inputs || {}).some((v) => v && v[1] === head)) {
      if (par.next === head) head = B[head].parent; else break;
    } else break;
  }
  console.log('--- call ' + id + ' (chain head ' + head + ')');
  let cur = head, n = 0;
  while (cur && n < 40) {
    const s = B[cur];
    console.log((cur === id ? '  >> ' : '     ') + short(s));
    if (cur === id) { for (let k = 0; k < 6 && s.next; k++) { cur = s.next; console.log('  +  ' + short(B[cur])); } break; }
    cur = s.next;
  }
}
console.log('total calls = ' + hits);
