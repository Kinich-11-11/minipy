const fs = require('fs');
const p = '_work/v41/pz20.txt';
let s = fs.readFileSync(p, 'utf8');
const old = "  before(one(find(al, (b) => b.opcode === 'data_setvariableto' && b.fields.VARIABLE[0] === 'augrp'), 'entry augrp'), 'A');";
const nw = [
  "  const chainFind = (head, pred) => { for (let cur = head; cur; cur = BL()[cur].next) if (pred(BL()[cur])) return cur; return null; };",
  "  const entId = chainFind(BL()[defIdOf('assignlist %s')].next, (b) => b.opcode === 'data_setvariableto' && b.fields.VARIABLE[0] === 'augrp');",
  "  if (!entId) throw new Error('[PZ20] no entry');",
  "  before(entId, 'A');"
].join('\n');
if (!s.includes(old)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(old, nw));
console.log('ok');
