const p = JSON.parse(require('fs').readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project.json','utf8'));
const it = p.targets.find(t=>t.name==='Interpreter');
const BL = it.blocks;
let n = 0;
for (const [id, b] of Object.entries(BL)) {
  if (b.opcode !== 'control_if' && b.opcode !== 'control_if_else') continue;
  const s = JSON.stringify(b.inputs || {});
  if (s.includes('"Tok"') && s.includes('"("') && s.includes('")"')) {
    console.log('CAND ' + id + ' ' + b.opcode + ' ' + s.slice(0, 260));
    n++;
    if (n >= 8) break;
  }
}
console.log('n=' + n);
