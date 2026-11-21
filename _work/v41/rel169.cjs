const fs = require('fs');
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.168.sb3 (newest)', 'MiniPy_v4.169.sb3 (newest)')
     .replace(/MiniPy_v4\.168\.sb3'/g, "MiniPy_v4.169.sb3'")
     .replace('MiniPy v4.168 - built', 'MiniPy v4.169 - built');
fs.writeFileSync('_work/v41/head.txt', h);
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p168 = 'P287'";
if (!r.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const ins = [
  '#   v4.169 = +P288 +P289 (Tier-1 item 2 COMPLETE: f-strings).  `f"{Q()}"` gave "<Q object>".',
  '#           P288 wrapped the strval/reprval calls inside `pctitem %s %s %s %s (vv,vt,spec,conv)`',
  '#           -- the converter shared by `%`, `.format` and spec-carrying f-strings (p152) -- and',
  '#           P289 then wrapped the one inside `fstr %s (idx)`, which turned out to be the path a',
  '#           plain `f"{obj}"` takes.  Both use the P281/P287 wrap pattern (detach next, insert',
  '#           `if evtype == "O" and (InstCls[ev] & ".__str__") in FnName: callmeth(...)` else the',
  '#           original call, re-link next) -- and neither may STOPTHIS, or the formatting is cut.',
  '#           Item 2 summary: str()/repr() builtins (P286), container reprs (P287), f-strings',
  '#           (P288+P289) all honour the dunders now; _sd 0/6 -> 5/6 (the 6th expects a memory',
  '#           address, so it can never match).)',
  "$p169 = 'P288'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
