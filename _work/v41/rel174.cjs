const fs = require('fs');
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.173.sb3 (newest)', 'MiniPy_v4.174.sb3 (newest)')
     .replace(/MiniPy_v4\.173\.sb3'/g, "MiniPy_v4.174.sb3'")
     .replace('MiniPy v4.173 - built', 'MiniPy v4.174 - built');
fs.writeFileSync('_work/v41/head.txt', h);
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p173 = 'P307'";
if (!r.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const ins = [
  '#   v4.174 = +P308 (Tier-3 item 12 COMPLETE: multiple inheritance).  With `class C(A, B)`,',
  '#           `isinstance(c, B)` and `issubclass(C, B)` were False (the second base was never on',
  '#           the ancestor chain), although method lookup already found B\'s methods.  The walker',
  '#           `isanc` computed the class\'s parent list (`clspar` -> `clssplit` -> CQ2) and then',
  '#           followed ONLY `CQ2["1"]`.  A PZ71 probe confirmed CQ2 really is the parent list in',
  '#           order (`PZ71 n=2|c1=A|c2=B|cur=C`), so P308 inserts "compare against every parent"',
  '#           just before that IFELSE.',
  '#           Two locator traps, both documented in the notes: (a) the search must be scoped to',
  '#           `reach(defIdOf(\'isanc\'))` -- a whole-project scan hit a same-shaped IFELSE in',
  '#           another proc and the patch silently did nothing; (b) the condition text must be',
  '#           walked as a SUBTREE, because `CQ2` lives in a `data_lengthoflist` field inside it.',
  '#           Verified: _mi 3/6 -> 6/6, _oo 22/30, func 31/31, _catch2 7/7 unchanged.',
  '#           (Limitation: the upward walk still follows only the first parent, so a match via a',
  '#           *second* parent\'s own ancestor is not covered.)',
  "$p174 = 'P308'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
