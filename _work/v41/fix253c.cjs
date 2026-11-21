const fs = require('fs');
const p = '_work/v41/p253.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "    && [...containsIds].some((cid) => deepHas(b.inputs.CONDITION[1], (x, xid) => xid === cid, 0)));";
const to = "    && [...containsIds].some((cid) => deepHas(b.inputs.CONDITION[1], (x) => x === BL()[cid], 0)));";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
