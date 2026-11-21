const fs = require('fs');
// head.txt
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.150.sb3 (newest)', 'MiniPy_v4.151.sb3 (newest)')
     .replace(/MiniPy_v4\.150\.sb3'/g, "MiniPy_v4.151.sb3'")
     .replace('MiniPy v4.150 - built', 'MiniPy v4.151 - built');
fs.writeFileSync('_work/v41/head.txt', h);
// rebuild-old.ps1
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p150 = 'P236'";
if (!r.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const ins = [
  '#   v4.151 = +P244 (`eval` now pre-splits at its ENTRY: if the range lo..hi contains a depth-0',
  '#           comma (not inside brackets, not a string), the whole range is a tuple -> hand it to',
  '#           `tuplelit` and stop.  This finally fixes the last family member:',
  '#           `x = f(), g()`, `y = p(), (3, 4)`, `def h(): return (1,2),(3,4)`, `s = [1,2],[3,4]`',
  '#           all used to raise "SyntaxError: parentheses" because the range was routed into the',
  '#           call path with argument range lo+2..hi-1 (probe: `CF@ fn=f lo=5 hi=8`).',
  '#           Guard: skip when `Tok[lo] == "lambda"` (a lambda\'s parameter commas are not tuple',
  '#           separators -- without this guard `lambda a, b: a+b` broke).',
  '#           `_paren2` 12->15/15, `_paren3` 3->7/7, func.json 31/31 kept, 0 broke elsewhere.)',
  "$p151 = 'P244'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
