const fs = require('fs');
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.162.sb3 (newest)', 'MiniPy_v4.163.sb3 (newest)')
     .replace(/MiniPy_v4\.162\.sb3'/g, "MiniPy_v4.163.sb3'")
     .replace('MiniPy v4.162 - built', 'MiniPy v4.163 - built');
fs.writeFileSync('_work/v41/head.txt', h);
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p162 = 'P280'";
if (!r.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const ins = [
  '#   v4.163 = +P281 (filter(None, xs)).  CPython treats None as the identity predicate for',
  '#           filter, so `filter(None, [0,1,"","a"])` keeps the truthy elements; MiniPy died with',
  '#           "NameError: name \'None\' is not defined".  In the P262 map/filter branch a new',
  '#           `mpisId` flag marks that case (filter + `Tok[lo+2] == "None"` + single argument),',
  '#           the "first argument must be a function name" check is relaxed for it, and the',
  '#           per-element `callval` is wrapped in `if mpisId == 0` so the truthiness test runs on',
  '#           the element itself.  THREE traps fixed while getting here: (a) `reach(branch)` walks',
  '#           `next` out of the branch -- use `reach(SUBSTACK)`; (b) the wrapper condition was',
  '#           inverted; (c) the flag reset was left as a floating statement, so `mpisId` leaked',
  '#           from one call to the next and made a later `map` skip its callback.)',
  "$p163 = 'P281'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
