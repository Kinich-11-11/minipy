const fs = require('fs');
let s = fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/p510.txt', 'utf8');
const oldBlock = [
  "  if (topIfs.length !== 1) throw new Error('[P510] top-level auexs ifs = ' + topIfs.length + ' (expected the 2nd copy marker)');",
  "  const stop = I('control_stop', { fields: { STOP_OPTION: ['this script', null] }, mutation: { tagName: 'mutation', children: [], hasnext: 'false' } });",
  "  // splice directly via the in-chain predecessor (predecessorOf is unsafe here:",
  "  // the augrp-if was created by a later patch, so block-id order lies about the chain)",
  "  const tgt = topIfs[0];",
  "  if (!tgt.pred) throw new Error('[P510] auexs-if has no in-chain predecessor');",
  "  const nx = BL()[tgt.pred].next;",
  "  BL()[tgt.pred].next = stop;",
  "  BL()[stop].parent = tgt.pred;",
  "  BL()[stop].next = nx;",
  "  if (nx) BL()[nx].parent = stop;",
  "  console.log('[P510] stop spliced before 2nd assignlist copy');"
].join('\n');
const newBlock = [
  "  if (topIfs.length !== 1) throw new Error('[P510] top-level auexs ifs = ' + topIfs.length + ' (expected the 2nd copy marker)');",
  "  // the stop must live INSIDE the augrp==0 branch (after its alrec tail): when",
  "  // augrp==1 (nested targets like `g, (h, i) = ...`) part A does nothing and part B",
  "  // is the real implementation - an unconditional stop here dropped those assignments.",
  "  const augrpIf = (topIfs[0].pred && BL()[topIfs[0].pred].opcode === 'control_if'",
  "    && JSON.stringify(BL()[BL()[topIfs[0].pred].inputs.CONDITION[1]]).includes('augrp')) ? topIfs[0].pred : null;",
  "  if (!augrpIf) throw new Error('[P510] augrp-if not found before auexs-if');",
  "  let tail = BL()[augrpIf].inputs.SUBSTACK[1];",
  "  let g = 0;",
  "  while (BL()[tail].next && g++ < 200) tail = BL()[tail].next;",
  "  if (BL()[tail].opcode !== 'control_stop') {",
  "    const stop = I('control_stop', { fields: { STOP_OPTION: ['this script', null] }, mutation: { tagName: 'mutation', children: [], hasnext: 'false' } });",
  "    const nx = BL()[tail].next;",
  "    BL()[tail].next = stop; BL()[stop].parent = tail;",
  "    BL()[stop].next = nx; if (nx) BL()[nx].parent = stop;",
  "  }",
  "  console.log('[P510] stop placed at end of augrp==0 branch');"
].join('\n');
if (!s.includes(oldBlock)) throw new Error('old block not found');
s = s.replace(oldBlock, newBlock);
fs.writeFileSync('D:/编程/scratch/ai/minipython/_work/v41/p510.txt', s);
console.log('p510 updated');
