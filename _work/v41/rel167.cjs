const fs = require('fs');
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.166.sb3 (newest)', 'MiniPy_v4.167.sb3 (newest)')
     .replace(/MiniPy_v4\.166\.sb3'/g, "MiniPy_v4.167.sb3'")
     .replace('MiniPy v4.166 - built', 'MiniPy v4.167 - built');
fs.writeFileSync('_work/v41/head.txt', h);
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p166 = 'P285'";
if (!r.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const ins = [
  '#   v4.167 = +P286 (Tier-1 item 2, part 1: the str()/repr() BUILTINS honour __str__/__repr__).',
  '#           `str(Q())` and `repr(R())` used to answer "<Q object>".  The previous attempt put',
  '#           `callmeth(inst, meth, 1, 0)` inside `strval`/`reprval` and broke things badly: those',
  '#           procs run while an expression is being evaluated, so the line\'s token stream is',
  '#           already in use and callmeth\'s synthesised call misbehaves (empty output / "too many',
  '#           arguments").  `printargs` gets away with the same call because it sits at STATEMENT',
  '#           level.  P286 therefore dispatches inside `callfn`\'s `str` and `repr` branches --',
  '#           right before their `strval`/`reprval` call -- exactly mirroring printargs:',
  '#               if evtype == "O" and (InstCls[ev] & ".__str__") in FnName:',
  '#                   callmeth(ev, "__str__", 1, 0) ; pending = 1 ; stop this script',
  '#           `str()` also falls back to `__repr__`, as in CPython.',
  '#           STILL OPEN (rest of item 2): f-strings and container reprs ([R()]) -- those reach',
  '#           strval/reprval from inside expressions, so they need the same statement-level trick',
  '#           at their own formatter.)',
  "$p167 = 'P286'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
