
const fs = require('fs');
const path = process.argv[2];
const p = JSON.parse(fs.readFileSync(path, 'utf8'));
const out = {};
out.meta = p.meta;
out.extensions = p.extensions;
out.monitors = (p.monitors||[]).length;
out.targets = (p.targets||[]).map(t => {
  const blocks = t.blocks || {};
  const ids = Object.keys(blocks);
  const opcodes = {};
  let topLevel = 0, vars = 0, lists = 0;
  for (const id of ids) {
    const b = blocks[id];
    if (b.topLevel) topLevel++;
    opcodes[b.opcode] = (opcodes[b.opcode]||0)+1;
  }
  return {
    name: t.name,
    isStage: !!t.isStage,
    blockCount: ids.length,
    topLevel,
    varCount: Object.keys(t.variables||{}).length,
    listCount: Object.keys(t.lists||{}).length,
    broadcastCount: Object.keys(t.broadcasts||{}).length,
    costumes: (t.costumes||[]).map(c=>c.name),
    sounds: (t.sounds||[]).length,
    opcodeKinds: Object.keys(opcodes).length,
    commentCount: Object.keys(t.comments||{}).length
  };
});
out.opcodeHistogram = (() => {
  const h = {};
  for (const t of p.targets) for (const id in (t.blocks||{})) {
    const o = t.blocks[id].opcode;
    h[o] = (h[o]||0)+1;
  }
  return Object.entries(h).sort((a,b)=>b[1]-a[1]);
})();
fs.writeFileSync(path.replace(/\.json$/, '.summary.json'), JSON.stringify(out, null, 1));
console.log('=== ' + path);
console.log('meta:', JSON.stringify(out.meta));
console.log('extensions:', JSON.stringify(out.extensions));
console.log('monitors:', out.monitors, ' totalBlocks:', out.opcodeHistogram.reduce((a,b)=>a+b[1],0), ' distinctOpcodes:', out.opcodeHistogram.length);
console.log('--- targets ---');
for (const t of out.targets) console.log(JSON.stringify(t));
