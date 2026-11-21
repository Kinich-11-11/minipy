const fs = require('fs');
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.174.sb3 (newest)', 'MiniPy_v4.175.sb3 (newest)')
     .replace(/MiniPy_v4\.174\.sb3'/g, "MiniPy_v4.175.sb3'")
     .replace('MiniPy v4.174 - built', 'MiniPy v4.175 - built');
fs.writeFileSync('_work/v41/head.txt', h);
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p174 = 'P308'";
if (!r.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const ins = [
  '#   v4.175 = +P309 (Tier-2 item 8, part 2: lambda DEFAULT arguments).  `f = lambda x, y=10:',
  '#           x+y` parsed and bound correctly but `f(1)` died with "TypeError: missing argument y"',
  '#           -- the default was never recorded.  The consumer (P100\'s binding loop, p100:126-134)',
  '#           reads `fdd = FnDef[fu]`: empty means "missing argument", otherwise',
  '#           `substr(fdd,3,len)` is the default\'s text and `letter(2,fdd)` its type tag, so',
  '#           FnDef entries look like `<lsep><typeTag><value text>` and there is ONE PER PARAMETER',
  '#           (P14 builds them from `DefDef`, p14:52-55).  `reglam` filled DefPar but appended a',
  '#           single EMPTY FnDef, desyncing the two lists.  P309 mirrors P14 inside reglam\'s',
  '#           parameter loop (parse `Tok[lo+1] == "="`, eval the default, push DefDef, then push',
  '#           that DefDef entry to FnDef) and disables the stray empty append afterwards.',
  '#           Verified: _lm 3/6 -> 4/6 (l2 = lambda defaults), _lm2 5/5, func 31/31, _oo 22/30.)',
  "$p175 = 'P309'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
