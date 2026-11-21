
const fs = require('fs');
const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const p = JSON.parse(zipRead('D:/编程/scratch/ai/minipython/MiniPy_v4.sb3').find(e => e.name === 'project.json').data.toString('utf8'));
const interp = p.targets.find(t => t.name === 'Interpreter');
const inIf = 'a9934c62dae24942a1fa';
let first = interp.blocks[inIf].inputs.SUBSTACK[1];
console.log('branch head', first, interp.blocks[first] && interp.blocks[first].opcode);
let cur = first, n = 0;
while (cur && n < 20) {
  const b = interp.blocks[cur];
  console.log(n, cur, b.opcode, JSON.stringify(b.fields).slice(0, 50), '| next =', JSON.stringify(b.next), '| subs =', JSON.stringify(b.inputs.SUBSTACK || b.inputs.SUBSTACK2 || null));
  if (b.opcode === 'control_repeat_until' && b.inputs.SUBSTACK) {
    let s = b.inputs.SUBSTACK[1], m = 0;
    while (s && m < 12) { const sb = interp.blocks[s]; console.log('       >', s, sb.opcode, JSON.stringify(sb.fields).slice(0, 40), 'next=', JSON.stringify(sb.next), 'sub=', JSON.stringify(sb.inputs.SUBSTACK || null)); s = sb.next; m++; }
  }
  cur = b.next; n++;
}
