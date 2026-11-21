
const fs = require('fs');
const crypto = require('crypto');
const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const b = zipRead('D:/编程/scratch/ai/minipython/MiniPy_v4.sb3');
const p = JSON.parse(b.find(e => e.name === 'project.json').data.toString('utf8'));
console.log('entries', b.length, '| targets', p.targets.map(t => t.name + ':' + Object.keys(t.blocks).length).join(' '));
let dangling = 0, missingParent = 0, badTop = 0;
for (const t of p.targets) {
  const ids = new Set(Object.keys(t.blocks));
  for (const [id, blk] of Object.entries(t.blocks)) {
    if (blk.next && !ids.has(blk.next)) { dangling++; console.log('bad next', t.name, id); }
    if (blk.parent && !ids.has(blk.parent)) { dangling++; console.log('bad parent', t.name, id, blk.opcode); }
    for (const [slot, inp] of Object.entries(blk.inputs || {})) {
      const ref = inp[1];
      if (typeof ref === 'string' && !ids.has(ref)) { dangling++; console.log('bad input', t.name, id, blk.opcode, slot); }
    }
    // parent must be present for every non-top-level block
    const isShadow = blk.shadow;
    if (!blk.topLevel && !isShadow && !blk.parent) {
      // allow blocks that are top of a stack inside an input? report them
      missingParent++;
    }
    if (blk.topLevel && blk.parent) badTop++;
  }
}
console.log('dangling refs:', dangling, '| non-top blocks without parent:', missingParent, '| topLevel blocks with parent:', badTop);
// variables/lists referenced but not declared
let badRefs = 0;
for (const t of p.targets) {
  const vars = new Set(Object.keys(t.variables || {}));
  const lists = new Set(Object.keys(t.lists || {}));
  const stage = p.targets.find(x => x.isStage);
  const svars = new Set(Object.keys(stage.variables || {})); const slists = new Set(Object.keys(stage.lists || {}));
  for (const blk of Object.values(t.blocks)) {
    if (blk.fields && blk.fields.VARIABLE && !vars.has(blk.fields.VARIABLE[1]) && !svars.has(blk.fields.VARIABLE[1])) { badRefs++; console.log('undefined var', t.name, blk.fields.VARIABLE[0]); }
    if (blk.fields && blk.fields.LIST && !lists.has(blk.fields.LIST[1]) && !slists.has(blk.fields.LIST[1])) { badRefs++; console.log('undefined list', t.name, blk.fields.LIST[0]); }
    for (const inp of Object.values(blk.inputs || {})) {
      if (Array.isArray(inp) && Array.isArray(inp[1]) && inp[1][0] === 12 && !vars.has(inp[1][2]) && !svars.has(inp[1][2])) { badRefs++; console.log('undefined var input', t.name, inp[1][1]); }
      if (Array.isArray(inp) && Array.isArray(inp[1]) && inp[1][0] === 13 && !lists.has(inp[1][2]) && !slists.has(inp[1][2])) { badRefs++; console.log('undefined list input', t.name, inp[1][1]); }
    }
  }
}
console.log('undefined variable/list references:', badRefs);
console.log('total variables:', p.targets.reduce((n, t) => n + Object.keys(t.variables || {}).length, 0));
console.log('meta:', JSON.stringify(p.meta));
const names = new Set(b.map(e => e.name));
let badAssets = 0;
for (const t of p.targets) for (const c of t.costumes || []) {
  if (!names.has(c.md5ext)) { badAssets++; console.log('missing asset', c.md5ext); continue; }
  const e = b.find(x => x.name === c.md5ext);
  const h = crypto.createHash('md5').update(e.data).digest('hex');
  if (h !== c.assetId) { badAssets++; console.log('md5 mismatch', c.md5ext); }
}
console.log('bad assets:', badAssets);
