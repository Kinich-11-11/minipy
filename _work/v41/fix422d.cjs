const fs = require('fs');
let s = fs.readFileSync('_work/v41/p422.txt', 'utf8');
const from = `  BB[target].next = null;
  BB[target].parent = gate;
  if (pred) { BB[pred].next = gate; BB[gate].parent = pred; }
  else { BB[slotParent].inputs[slot] = [2, gate]; BB[gate].parent = slotParent; }`;
const to = `  const after = BB[target].next;          // 必须保住后续语句（弹栈/累加等）
  BB[target].next = null;
  BB[target].parent = gate;
  BB[gate].next = after;
  if (after) BB[after].parent = gate;
  if (pred) { BB[pred].next = gate; BB[gate].parent = pred; }
  else { BB[slotParent].inputs[slot] = [2, gate]; BB[gate].parent = slotParent; }`;
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p422.txt', s.replace(from, to));
console.log('tail link restored');