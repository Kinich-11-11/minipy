const fs = require('fs');
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.165.sb3 (newest)', 'MiniPy_v4.166.sb3 (newest)')
     .replace(/MiniPy_v4\.165\.sb3'/g, "MiniPy_v4.166.sb3'")
     .replace('MiniPy v4.165 - built', 'MiniPy v4.166 - built');
fs.writeFileSync('_work/v41/head.txt', h);
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p165 = 'P283'";
if (!r.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const ins = [
  '#   v4.166 = +P285 (Tier-1 item 1: mutations of an ENCLOSING frame variable must survive the',
  '#           frame rebuild).  Repro: `def build2b(out): def add(v): out.append(v); add(1);',
  '#           return out` -- CPython [1], MiniPy [].  Root cause is the frame model p104 documents:',
  '#           calluser keeps the caller\'s variable table in FN/FV/FT and rebuilds it on return, so',
  '#           a nested call\'s mutation of an outer variable is restored away (the same reason',
  '#           `global` needed P104\'s GName capture/write-back).  P285 mirrors that machinery for',
  '#           names mutated during the call: `publish %s` (which p169 notes is the common tail of',
  '#           indexset/indexdel/slicewrite/methodcall/dictmeth/setmeth) records the name in MName;',
  '#           calluser captures the MName entries that exist in the caller\'s table into MSave*',
  '#           right before the table rebuild, and writes them back right after it, exactly like',
  '#           P104 does for GName.  Same documented corner: MName is global, so a plain local',
  '#           assignment can be written back too -- but only when the name exists in the caller.',
  '#           Verified: _na 3/5 -> 4/5 (b2 fixed), _al 6/6, and EVERY other suite unchanged.)',
  "$p166 = 'P285'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
