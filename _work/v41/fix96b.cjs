const fs = require('fs');
let s = fs.readFileSync('_work/v41/pz96.txt', 'utf8');
const from = "    if (ownerOf(id) !== 'eval %s %s') continue;";
const to = [
  "    const ow = ownerOf(id);",
  "    if (ow === 'eval %s %s') continue;",
  "    if (!/atom|callfn|calluser|cdo|methodcall|indexget|listlit|builtin/.test(ow)) continue;"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, to);
fs.writeFileSync('_work/v41/pz96.txt', s);
console.log('ok');