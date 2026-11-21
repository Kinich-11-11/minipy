const fs = require('fs');
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.169.sb3 (newest)', 'MiniPy_v4.170.sb3 (newest)')
     .replace(/MiniPy_v4\.169\.sb3'/g, "MiniPy_v4.170.sb3'")
     .replace('MiniPy v4.169 - built', 'MiniPy v4.170 - built');
fs.writeFileSync('_work/v41/head.txt', h);
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p169 = 'P288'";
if (!r.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const ins = [
  '#   v4.170 = +P293 +P294 +P296 (Tier-1 item 3: `except ... as e` binds a real exception',
  '#           INSTANCE, and type() reports its class).  Three pieces:',
  '#             * P293 -- the binding statement in trycatch is `assign %s %s %s (vn=$asnm,',
  '#               vv=$asmsg, vt="S")`, and its inputs are INLINE primitives, not data_variable',
  '#               blocks: vv is `[3,[12,"asmsg","bvar_.."],[10,""]]`.  So the patch (a) inserts a',
  '#               prelude before it that computes `eid`/`evt2` (the instance id and its type tag)',
  '#               and (b) rewrites those two inputs to point at `eid`/`evt2`.  The class name comes',
  '#               from `tnm`, which p51\'s raise branch already holds (it builds "tnm: msg"),',
  '#               recorded into a new ErrN list; internal failures (1/0) fall back to slicing the',
  '#               class name out of the error text.',
  '#             * P294 -- the real culprit was type(): callfn\'s `fn == "type"` ladder had NO case',
  '#               for instances, so every one answered "<class \'object\'>".  P294 adds it, using',
  '#               P129\'s spelling: builtin exception names (P271\'s ExcNames) give',
  '#               "<class \'ZeroDivisionError\'>", user classes "<class \'__main__.E\'>".',
  '#             * P296 -- now that `as e` is an instance, `str(e)` would print "<E object>"; P129',
  '#               only looked up the hidden `__msg__` attribute inside printargs, so P296 adds the',
  '#               same lookup (IAttrId/IAttrName == "__msg__") to strval\'s instance branch.',
  '#           Verified: _ex (per-assert probe) 2/8 -> 5/8, _oo unchanged 22/30, _catch2 7/7.',
  '#           Still open in item 3: `type(e) == E` (class values compare by object), custom',
  '#           exception attributes (e.code), and `type(e).__name__` keeps the __main__. prefix.)',
  "$p170 = 'P293'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
