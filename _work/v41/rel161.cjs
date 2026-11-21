const fs = require('fs');
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.160.sb3 (newest)', 'MiniPy_v4.161.sb3 (newest)')
     .replace(/MiniPy_v4\.160\.sb3'/g, "MiniPy_v4.161.sb3'")
     .replace('MiniPy v4.160 - built', 'MiniPy v4.161 - built');
fs.writeFileSync('_work/v41/head.txt', h);
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p160 = 'P271'";
if (!r.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const ins = [
  '#   v4.161 = +P276 (sorted(dict, key=...)).  `sorted({"bb":1,"a":2}, key=len)` died with',
  '#           "TypeError: sorted() requires a list" although plain `sorted(d)` worked (P149).',
  '#           The real shape of the offending branch is',
  '#               if evtype == "D":  dictkeys(ev); fail "TypeError: sorted() requires a list"',
  '#           i.e. the fail sits INSIDE the dict branch and runs unconditionally -- `dictkeys`',
  '#           already fixed the value up, so conversion and the error both happened.  Patching',
  '#           `dictkeys` (tried twice) or setting evtype="L" cannot help; the fail itself has to',
  '#           become conditional.  The patch wraps every "requires a list" fail (6 sites) in',
  '#           `if evtype != "L":  fail(...)`, so a dict that has just been converted to its keys',
  '#           proceeds while genuinely non-iterable values still raise.',
  '#           Result: sorted(dict, key=lambda ...) and sorted(dict, reverse=True) now match CPython;',
  '#           sorted(dict, key=<builtin>) returns the keys unsorted (remaining gap, noted).)',
  "$p161 = 'P276'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
