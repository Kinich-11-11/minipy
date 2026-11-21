const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/project.json', 'utf8'));
const B = p.targets.find((t) => t.name === 'Interpreter').blocks;
const litOf = (d) => {
  if (!Array.isArray(d)) return null;
  if ((d[0] === 10 || d[0] === 4) && typeof d[1] !== 'object') return String(d[1]);
  if ((d[0] === 1 || d[0] === 2 || d[0] === 3) && Array.isArray(d[1])) return litOf(d[1]);
  return null;
};
// 收集 fail %s 调用里的所有 text 字面量（沿块树）
const texts = [];
const walk = (id, d, out) => {
  if (!id || d > 25 || typeof id !== 'string') return;
  const b = B[id];
  if (!b) return;
  if (b.opcode === 'text') out.push(String(b.fields.TEXT[0]));
  for (const v of Object.values(b.inputs || {})) {
    if (v && typeof v[1] === 'string') walk(v[1], d + 1, out);
    const l = litOf(v);
    if (l) out.push(l);
  }
  walk(b.next, d + 1, out);
};
const owner = (id) => {
  let cur = id;
  for (let g = 0; g < 4000 && cur; g++) {
    const par = B[cur].parent;
    if (!par) return '?';
    const pb = B[par];
    if (pb.opcode === 'procedures_definition') return B[pb.inputs.custom_block[1]].mutation.proccode.replace(/%s/g, '_');
    cur = par;
  }
  return '?';
};
const CLASSES = ['TypeError', 'ValueError', 'NameError', 'KeyError', 'IndexError', 'AttributeError', 'ZeroDivisionError', 'SyntaxError', 'RuntimeError', 'RecursionError', 'OverflowError', 'UnboundLocalError', 'StopIteration', 'ImportError', 'MemoryError', 'EOFError', 'AssertionError', 'NotImplementedError', 'OSError', 'ArithmeticError', 'LookupError'];
const suspicious = new Map();
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_call' || !b.mutation || b.mutation.proccode !== 'fail %s') continue;
  const out = [];
  walk(b.inputs[Object.keys(b.inputs)[0]] && b.inputs[Object.keys(b.inputs)[0]][1], 0, out);
  for (const t of out) {
    const s = String(t);
    if (!/[A-Za-z]/.test(s)) continue;
    if (!/(Error|Exception|Iteration|Interrupt)/.test(s)) continue;
    const hasClass = CLASSES.some((c) => s.indexOf(c + ': ') === 0);
    if (hasClass) continue;
    const key = s.slice(0, 55);
    if (!suspicious.has(key)) suspicious.set(key, { n: 0, owner: owner(id) });
    suspicious.get(key).n++;
  }
}
const rows = [...suspicious.entries()].sort((a, b) => b[1].n - a[1].n);
console.log('distinct suspicious (no "Class: " prefix) = ' + rows.length);
for (const [k, v] of rows.slice(0, 30)) console.log('  x' + v.n + '  [' + v.owner + ']  ' + JSON.stringify(k));
