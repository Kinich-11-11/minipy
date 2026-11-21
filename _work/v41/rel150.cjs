const fs = require('fs');
// head.txt
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.149.sb3 (newest)', 'MiniPy_v4.150.sb3 (newest)')
     .replace(/MiniPy_v4\.149\.sb3'/g, "MiniPy_v4.150.sb3'")
     .replace('MiniPy v4.149 - built', 'MiniPy v4.150 - built');
fs.writeFileSync('_work/v41/head.txt', h);
// rebuild-old.ps1
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p149 = 'P237'";
if (!r.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const ins = [
  '#   v4.150 = +P236 (`eval` also stripped an outer `[` ... `]` pair whenever the first token was `[`',
  '#           and the last was `]`, without checking that they match.  For `s = [1, 2], [3, 4]`',
  '#           it called `listlit(lo+1, hi-1)` i.e. `listlit(4, 12)` (probe PZ32), so the element',
  '#           split ran on `1 , 2 ] , [ 3 , 4`.  Same depth check as P235.  NOTE: this patch was',
  '#           written during round 28 but was a NO-OP back then -- the earlier failure happened in',
  '#           the index/path layer (fixed by P237 in v4.149), so this branch was never reached.)',
  "$p150 = 'P236'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
