const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const proj = JSON.parse(zipRead(process.argv[2]).find(e=>e.name==='project.json').data.toString('utf8'));
const t = proj.targets.find(x=>x.name==='Interpreter');
const B = t.blocks;
// find the block holding the PCTBRANCH literal
let target = null;
for (const id in B) { const b = B[id]; const s = JSON.stringify(b.inputs||{}); if (s.indexOf('PCTBRANCH') >= 0) { target = id; break; } }
console.log('PCTBRANCH block:', target);
// walk parents up
const chain = [];
let cur = target, guard = 0;
while (cur && guard++ < 400) { const b = B[cur]; if (!b) break; chain.push(b.opcode + (b.fields && b.fields.TEXT ? '=' + b.fields.TEXT[0] : '')); cur = b.parent; }
console.log('ancestor chain:', chain.join(' < '));
// reachability from every top-level block
const seen = new Set();
const stack = [];
for (const id in B) if (B[id].topLevel) stack.push(id);
while (stack.length) {
  const id = stack.pop();
  if (!id || seen.has(id)) continue;
  seen.add(id);
  const b = B[id]; if (!b) continue;
  if (b.next) stack.push(b.next);
  for (const k in (b.inputs||{})) { const v = b.inputs[k]; for (let i = 1; i < v.length; i++) { const x = v[i]; if (typeof x === 'string' && B[x]) stack.push(x); } }
}
console.log('reachable from top level:', seen.has(target));