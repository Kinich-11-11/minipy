
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
function argVal(t, b, name) {
  const inp = b.inputs && b.inputs[name];
  if (!inp) return null;
  const v = inp[1];
  if (Array.isArray(v)) return v[1];
  if (typeof v === 'string') { const tgt = t.blocks[v]; return tgt ? tgt.fields && tgt.fields.TEXT ? tgt.fields.TEXT[0] : '[block ' + tgt.opcode + ']' : null; }
  return null;
}
console.log('##### ' + process.argv[2]);
for (const t of p.targets) {
  const blocks = t.blocks||{};
  const procs = [], hats = [];
  for (const id in blocks) {
    const b = blocks[id];
    if (b.opcode === 'procedures_prototype') {
      const def = Object.values(blocks).find(x=>x.opcode==='procedures_definition' && x.inputs.custom_block && x.inputs.custom_block[1]===id);
      procs.push((b.mutation && b.mutation.proccode) || '?');
    }
    if (b.opcode === 'procedures_definition') {
      // handled above
    }
    if (b.topLevel && b.opcode.startsWith('event_')) {
      hats.push(b.opcode + (b.fields && b.fields.BROADCAST_OPTION ? ' :: ' + b.fields.BROADCAST_OPTION[0] : '') + (b.opcode==='event_whenkeypressed' ? ' :: ' + b.fields.KEY_OPTION[0] : ''));
    }
  }
  if (procs.length) {
    console.log('=== ' + t.name + ' (' + procs.length + ' custom blocks) ===');
    console.log(procs.map(x=>x.replace(/^[^%]*?([A-Za-z_\u4e00-\u9fff].*)$/,'$1')).slice(0,400).join('\n'));
  }
  if (hats.length) {
    console.log('--- ' + t.name + ' hats (' + hats.length + ') ---');
    console.log(hats.join('\n'));
  }
}
