const fs = require('fs');
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.170.sb3 (newest)', 'MiniPy_v4.171.sb3 (newest)')
     .replace(/MiniPy_v4\.170\.sb3'/g, "MiniPy_v4.171.sb3'")
     .replace('MiniPy v4.170 - built', 'MiniPy v4.171 - built');
fs.writeFileSync('_work/v41/head.txt', h);
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p170 = 'P293,P294,P296'";
if (!r.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const ins = [
  '#   v4.171 = +P295 (`type(x).__name__` drops the `__main__.` prefix).  P294 made user-class',
  '#           instances answer "<class \'__main__.E\'>" (matching CPython), but P265\'s __name__',
  '#           fast path -- the ONE `substr %s %s %s` call in eval, with args (ev, 9, len(ev)-2) --',
  '#           then yielded "__main__.E".  P295 appends a strip right after that substr.',
  '#           TWO off-by-one traps were hit getting here: the literal is written as the INTEGER',
  '#           shadow `[4,"9"]` (not `[10,"9"]`), and `__main__.E` is exactly 10 characters, so the',
  '#           length guard must be `> 9`, not `> 10`.  (The `substr` site was located by finding',
  '#           the call whose second argument is a literal 9 -- it is unique inside eval.)',
  '#           Verified: _ex 5/8 -> 6/8 (only x3 type(e)==E and x4 custom attrs left), _oo 22/30,',
  '#           _catch2 7/7 unchanged.)',
  "$p171 = 'P295'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
