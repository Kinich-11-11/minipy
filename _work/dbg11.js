
const fs = require('fs');
const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const p = JSON.parse(zipRead('D:/编程/scratch/ai/minipython/MiniPy_v4.sb3').find(e => e.name === 'project.json').data.toString('utf8'));
const ctrl = p.targets.find(t => t.name === 'Controller');
// find all blocks that change varpage
for (const [id, b] of Object.entries(ctrl.blocks)) {
  if (b.opcode === 'data_changevariableby' && b.fields.VARIABLE && b.fields.VARIABLE[0] === 'varpage') {
    let chain = [], cur = b.parent, hops = 0;
    while (cur && hops++ < 6) { const x = ctrl.blocks[cur]; chain.push(x.opcode + (x.inputs.CONDITION ? ' cond=' + JSON.stringify(x.inputs.CONDITION) : '')); cur = x.parent; }
    console.log('varpage changer', id, '| ancestors:', chain.join(' <- '));
  }
}
// also check the interpreter side: is ** handled as unary-previous op?
const interp = p.targets.find(t => t.name === 'Interpreter');
let found = 0;
for (const [id, b] of Object.entries(interp.blocks)) {
  if (b.opcode === 'operator_or') {
    let has = false;
    const chk = (x, d) => { if (!x || d > 5) return false; const bb = interp.blocks[x]; if (!bb) return false; for (const inp of Object.values(bb.inputs || {})) { if (!Array.isArray(inp)) continue; if (Array.isArray(inp[1]) && inp[1][0] === 10 && inp[1][1] === '//') return true; if (typeof inp[1] === 'string' && chk(inp[1], d + 1)) return true; } return false; };
    if (chk(id, 0)) { found++; if (found < 3) console.log('// or-block', id, 'parent=', b.parent, ctrl.blocks[b.parent] ? '' : '', interp.blocks[b.parent] && interp.blocks[b.parent].opcode); }
  }
}
console.log('or-blocks mentioning //:', found);
