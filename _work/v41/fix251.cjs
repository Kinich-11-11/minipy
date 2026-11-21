const fs = require('fs');
const p = '_work/v41/p251.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "  const loop = find([BL()[g].inputs.SUBSTACK[1]], (x) => x.opcode === 'control_repeat_until')[0];";
const to = [
  "  let loop = null;",
  "  {",
  "    let cur = BL()[g].inputs.SUBSTACK[1];",
  "    for (let i = 0; i < 30 && cur; i++, cur = BL()[cur].next) {",
  "      if (BL()[cur].opcode === 'control_repeat_until') { loop = cur; break; }",
  "    }",
  "  }"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
