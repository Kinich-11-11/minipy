const fs = require('fs');
const p = '_work/v41/p248.txt';
let s = fs.readFileSync(p, 'utf8');
const anchor = "    const first = asBlock(vals[0]);";
const dbg = [
  "    console.log('[P248dbg] assign call ' + id + ' vals=' + vals.length + ' v1=' + JSON.stringify(vals[0]).slice(0, 60) + ' v2=' + JSON.stringify(vals[1]).slice(0, 60));",
  anchor
].join('\n');
if (!s.includes(anchor)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(anchor, dbg));
console.log('ok');
