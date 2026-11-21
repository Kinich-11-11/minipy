const fs = require('fs');
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.175.sb3 (newest)', 'MiniPy_v4.176.sb3 (newest)')
     .replace(/MiniPy_v4\.175\.sb3'/g, "MiniPy_v4.176.sb3'")
     .replace('MiniPy v4.175 - built', 'MiniPy v4.176 - built');
fs.writeFileSync('_work/v41/head.txt', h);
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p175 = 'P309'";
if (!r.includes(anchor)) { console.log('MISS anchor'); exit1(); }
function exit1() { process.exit(1); }
const ins = [
  '#   v4.176 = +P313 (Tier-2 item 8 COMPLETE: builtin names as values).  `apply(str, 4)` and',
  '#           `h = abs ; h(-3)` died with `NameError: name \'str\' is not defined`.  Three pieces:',
  '#             * a new `BifNames` list, built AT PATCH TIME by scanning callfn/builtin2/builtin2b',
  '#               for every `fn == "<literal>"` comparison (so the table grows out of the',
  '#               implementation instead of being hand-maintained);',
  '#             * the bare-name NameError inside `atom %s` is wrapped: when the name is in',
  '#               BifNames the value becomes (name, "F") instead of raising.  PZ75 found this site',
  '#               by numbering all 12 `NameError: name \'` fails project-wide and seeing that #1 in',
  '#               `atom` fires -- which is why two earlier attempts (wrapping eval\'s site, then',
  '#               calluser\'s) were installed but inert.  The name sits in `ev` there, NOT in',
  '#               `Tok[lo]`;',
  '#             * in `calluser`, dispatch to `callfn(fi, lo, hi)` right after `fi = Values[found]`',
  '#               (before the arity guards -- otherwise a function value makes the guards misread',
  '#               and raise "too many arguments").',
  '#           A separate attempt that REGISTERED builtin names as run-start variables had to be',
  '#           abandoned: it shadowed user calls (func 31->28, _oo 22->18, all "too many',
  '#           arguments").  Verified: _lm 4/6 -> 6/6, func 31/31, _oo 22/30 unchanged.)',
  "$p176 = 'P313'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
