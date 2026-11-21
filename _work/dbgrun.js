
const fs = require('fs');
const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const p = JSON.parse(zipRead('D:/编程/scratch/ai/minipython/MiniPy_v3.sb3').find(e => e.name === 'project.json').data.toString('utf8'));
const interp = p.targets.find(t => t.name === 'Interpreter');
const runHat = Object.entries(interp.blocks).find(([id, b]) => b.topLevel && b.opcode === 'event_whenbroadcastreceived' && b.fields.BROADCAST_OPTION[0] === 'RUN')[0];
console.log('run hat', runHat);
// walk recursively and list every block whose opcode mentions dirty or wait
const seen = new Set();
const stack = [interp.blocks[runHat].next];
while (stack.length) {
  const id = stack.pop();
  if (!id || seen.has(id)) continue;
  seen.add(id);
  const b = interp.blocks[id];
  if (!b) continue;
  if (b.opcode === 'data_setvariableto' || b.opcode === 'control_wait' || b.opcode === 'data_changevariableby') {
    console.log(id, b.opcode, JSON.stringify(b.fields), 'VALUE=' + JSON.stringify(b.inputs.VALUE || b.inputs.DURATION), 'parent=' + b.parent, 'next=' + b.next);
  }
  if (b.next) stack.push(b.next);
  for (const inp of Object.values(b.inputs || {})) if (Array.isArray(inp)) for (let i = 1; i < inp.length; i++) if (typeof inp[i] === 'string') stack.push(inp[i]);
}
