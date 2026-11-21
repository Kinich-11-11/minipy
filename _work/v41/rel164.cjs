const fs = require('fs');
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.163.sb3 (newest)', 'MiniPy_v4.164.sb3 (newest)')
     .replace(/MiniPy_v4\.163\.sb3'/g, "MiniPy_v4.164.sb3'")
     .replace('MiniPy v4.163 - built', 'MiniPy v4.164 - built');
fs.writeFileSync('_work/v41/head.txt', h);
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p163 = 'P281'";
if (!r.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const ins = [
  '#   v4.164 = +P282 (iter() on a non-iterable).  v4.162 shipped the minimal iter/next and noted',
  '#           that `iter(5)` answered 5 instead of raising; this patch closes that gap with THREE',
  '#           deliberately SHALLOW checks (evtype == "N" / "Z" / "B") inserted just before the',
  '#           `pending = 1` of the iter branch in `callfn`.  The earlier, fuller version (a deep',
  '#           OR plus a `tname`-built message) crashed p68\'s `copyBlock`, so the shallow form is',
  '#           used on purpose; the message is a plain literal, which trycatch still matches by the',
  '#           "TypeError: " prefix.  `iter("ab")` / `iter({"a":1})` / `iter((1,2))` are unaffected',
  '#           because strings and dicts are converted before the checks run.)',
  "$p164 = 'P282'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
