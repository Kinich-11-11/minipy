const fs = require('fs');
const p = '_work/v41/p248.txt';
let s = fs.readFileSync(p, 'utf8');
const from = [
  "    const head = BL()[b.inputs.SUBSTACK[1]];",
  "    if (head && head.opcode === 'data_addtolist' && head.fields.LIST[0] === 'AName') simpleLoop.push(id);"
].join('\n');
const to = [
  "    let cur = b.inputs.SUBSTACK[1], hit = false;",
  "    for (let i = 0; i < 40 && cur; i++, cur = BL()[cur].next) {",
  "      const x = BL()[cur];",
  "      if (x && x.opcode === 'data_addtolist' && x.fields.LIST && x.fields.LIST[0] === 'AName') { hit = true; break; }",
  "    }",
  "    if (hit) simpleLoop.push(id);"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
