
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v5/project.json','utf8'));
const out = {};
out.meta = p.meta;
out.extensions = p.extensions;
out.targets = p.targets.length;
out.monitors = p.monitors ? p.monitors.length : 0;
out.extensionURLs = p.extensionURLs || null;
const summary = [];
let totalBlocks = 0;
for (const t of p.targets) {
  const blocks = t.blocks || {};
  const ids = Object.keys(blocks);
  totalBlocks += ids.length;
  const opcodes = {};
  for (const id of ids) { const b = blocks[id]; if (!b || !b.opcode) continue; opcodes[b.opcode] = (opcodes[b.opcode]||0)+1; }
  const topLevel = ids.filter(id => blocks[id] && blocks[id].topLevel);
  summary.push({
    name: t.name,
    isStage: t.isStage,
    x: t.x, y: t.y, visible: t.visible,
    layerOrder: t.layerOrder,
    costumes: (t.costumes||[]).length,
    sounds: (t.sounds||[]).length,
    vars: Object.keys(t.variables||{}).length,
    lists: Object.keys(t.lists||{}).length,
    broadcasts: Object.keys(t.broadcasts||{}).length,
    blocks: ids.length,
    topLevelScripts: topLevel.length,
    opcodeCount: Object.keys(opcodes).length,
    opcodes,
  });
}
out.summary = summary;
out.totalBlocks = totalBlocks;
fs.writeFileSync('D:/编程/scratch/ai/minipython/_work/v5-analysis.json', JSON.stringify(out,null,1));
console.log('targets', p.targets.length, 'blocks', totalBlocks, 'ext', JSON.stringify(p.extensions));
console.log(summary.map(s=>[s.name,s.isStage?'STAGE':'sprite',s.blocks,'scripts:'+s.topLevelScripts,'vars:'+s.vars,'lists:'+s.lists,'cost:'+s.costumes,'snd:'+s.sounds,'bcast:'+s.broadcasts].join(' | ')).join('\n'));
