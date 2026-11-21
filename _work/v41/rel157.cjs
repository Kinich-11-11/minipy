const fs = require('fs');
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.156.sb3 (newest)', 'MiniPy_v4.157.sb3 (newest)')
     .replace(/MiniPy_v4\.156\.sb3'/g, "MiniPy_v4.157.sb3'")
     .replace('MiniPy v4.156 - built', 'MiniPy v4.157 - built');
fs.writeFileSync('_work/v41/head.txt', h);
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p156 = 'P263'";
if (!r.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const ins = [
  '#   v4.157 = +P265 (`type(x).__name__`).  MiniPy\'s `type(x)` answers the display string',
  '#           `<class \'int\'>`, and a trailing-dot attribute read on that string died with',
  '#           "AttributeError: \'str\' object has no attribute \'__name__\'".  eval now has an early',
  '#           branch for `Tok[hi-1] == "." and Tok[hi] == "__name__"`: it evaluates the receiver and',
  '#           (for a string) takes `substr(ev, 9, len-2)`, i.e. the name inside `<class \'...\'>`,',
  '#           then returns.  `type(3).__name__` -> int, and the AttributeError is gone.',
  '#           Known gap (separate): for an `except ... as e` binding MiniPy holds the exception',
  '#           MESSAGE string, so `type(e).__name__` answers "str" instead of the class name.)',
  "$p157 = 'P265'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
