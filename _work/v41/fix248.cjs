const fs = require('fs');
const p = '_work/v41/p248.txt';
let s = fs.readFileSync(p, 'utf8');
const from = [
  "  const clearAType = find(al, (b) => b.opcode === 'data_deletealloflist' && b.fields.LIST[0] === 'AType');",
  "  if (clearAType.length !== 1) throw new Error('[P248] AType clear = ' + clearAType.length);",
  "  spliceAfter(clearAType[0], chain([clearl('ATgtLo'), clearl('ATgtHi')]));"
].join('\n');
const to = [
  "  const clearAName = find(al, (b) => b.opcode === 'data_deletealloflist' && b.fields.LIST[0] === 'AName');",
  "  if (!clearAName.length) throw new Error('[P248] AName clear = ' + clearAName.length);",
  "  spliceAfter(clearAName[0], chain([clearl('ATgtLo'), clearl('ATgtHi')]));"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
