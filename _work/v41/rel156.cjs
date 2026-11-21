const fs = require('fs');
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.155.sb3 (newest)', 'MiniPy_v4.156.sb3 (newest)')
     .replace(/MiniPy_v4\.155\.sb3'/g, "MiniPy_v4.156.sb3'")
     .replace('MiniPy v4.155 - built', 'MiniPy v4.156 - built');
fs.writeFileSync('_work/v41/head.txt', h);
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p155 = 'P262'";
if (!r.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const ins = [
  '#   v4.156 = +P263 (`d.update(b=2)`, keyword arguments to dict.update).  The dict `update` branch',
  '#           in `dictmeth` handed the whole argument span to `eval`, so `b=2` died with',
  '#           "SyntaxError: expression".  The branch now detects a top-level `=` (not `==`/`<=`/`>=`),',
  '#           splits the span into `name = value` pairs at top-level commas, evaluates only the',
  '#           values, and builds the dict record itself (lsep + type + value, keys as string keys),',
  '#           then merges with the existing `dupd(rec, acc)` and re-assigns the merged result.',
  '#           Two gotchas: `lesc` writes its result back into `ev` (so the value must be saved',
  '#           first), and `dupd` answers the MERGED dict in `ev` (assign that, not the new part).)',
  "$p156 = 'P263'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
