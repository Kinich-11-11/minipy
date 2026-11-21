const fs = require('fs');
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.177.sb3 (newest)', 'MiniPy_v4.178.sb3 (newest)')
     .replace(/MiniPy_v4\.177\.sb3'/g, "MiniPy_v4.178.sb3'")
     .replace('MiniPy v4.177 - built', 'MiniPy v4.178 - built');
fs.writeFileSync('_work/v41/head.txt', h);
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p177 = 'P315'";
if (!r.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const ins = [
  '#   v4.178 = +P317 (Tier-3 item 11, first dunder: len() honours __len__).',
  '#           `class A: def __len__(self): return 3` then `len(A())` died with',
  '#           "TypeError: object of type \'A\' has no len()".  The report site is inside `callfn`',
  '#           (note there are TWO statements carrying that text -- the first lives in `castmsg`,',
  '#           so locate by "any statement whose SUBTREE contains the text", not by assuming',
  '#           setMsg/procedures_call).  P317 inserts, just before it, the same shape P286 uses for',
  '#           str()/__str__:  if evtype == "O" and (InstCls[ev] & ".__len__") in FnName then',
  '#           callmeth(ev, "__len__", 1, 0) and stop -- callmeth leaves the return value in',
  '#           ev/evtype, so len() simply yields it.',
  '#           Verified: _oo 22/30 -> 23/30 (o5), func 31/31 unchanged.)',
  "$p178 = 'P317'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
