const fs = require('fs');
// head.txt
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.148.sb3 (newest)', 'MiniPy_v4.149.sb3 (newest)')
     .replace(/MiniPy_v4\.148\.sb3'/g, "MiniPy_v4.149.sb3'")
     .replace('MiniPy v4.148 - built', 'MiniPy v4.149 - built');
fs.writeFileSync('_work/v41/head.txt', h);
// rebuild-old.ps1
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p148 = 'P235'";
if (!r.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const ins = [
  '#   v4.149 = +P237 (`eval` treats an expression ending in `]` as "path prefix + [index]" and picks',
  '#           the index bracket as the LAST depth-0 `[`.  For `s = [1, 2], [3, 4]` that made the',
  '#           prefix `[1, 2], ` look like a path and handed the WHOLE range to `indexget`',
  '#           (probe: `IG@IG2 lo=3 hi=13`), which then raised',
  '#           "TypeError: list index must be an integer".  The gate now also requires that the',
  '#           prefix contains no top-level comma.  NB: scanning via `hascomma` broke cov3/cov5',
  '#           (it clobbers shared scratch), so the scan is inlined with its own variables.)',
  "$p149 = 'P237'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
