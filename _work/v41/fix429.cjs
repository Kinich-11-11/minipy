const fs = require('fs');
let s = fs.readFileSync('_work/v41/p429.txt', 'utf8');
const from = "  const def = newProc('callmethv %s %s %s %s', ['inst', 'meth', 'aval', 'atype']);";
const to = "  newProc('callmethv %s %s %s %s', ['inst', 'meth', 'aval', 'atype']);\n  const def = defIdOf('callmethv %s %s %s %s');   // makeProcedure 不返回块 id，这里按过程名取\n  if (!def) throw new Error('[P429] callmethv definition not found after newProc');";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p429.txt', s.replace(from, to));
console.log('defId lookup installed');