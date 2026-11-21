const fs = require('fs');
// head
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.175.sb3 (newest)', 'MiniPy_v4.176.sb3 (newest)')
     .replace(/MiniPy_v4\.175\.sb3'/g, "MiniPy_v4.176.sb3'")
     .replace('MiniPy v4.175 - built', 'MiniPy v4.176 - built');
fs.writeFileSync('_work/v41/head.txt', h);
// rebuild-old.ps1：第 42 轮留下的 $p176 = 'P313' 要改成 P314（P313 已撤链）
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
if (r.includes("$p176 = 'P313'")) {
  r = r.replace("$p176 = 'P313'", "$p176 = 'P314'");
  r = r.replace(/#   v4\.176 = \+P313[\s\S]*?#           arguments\)\.  Verified: _lm 4\/6 -> 6\/6, func 31\/31, _oo 22\/30 unchanged\.\)/,
    [
      '#   v4.176 = +P314 (Tier-3 item 10, first half: assigning a CLASS attribute through the',
      '#           class name).  `class B: n = 1` then `B.n = 5` died with "AttributeError: only',
      '#           instances have attributes" (same for `D.n = D.n + 1` inside a method and',
      '#           `F.n = F.n + 1` in __init__).  P55\'s `A.b = v` branch required',
      '#           `found != 0 and Types[found] == "O"`, but class names are NOT variables, so',
      '#           lookup failed and found stayed 0.  Class attributes live in the very same',
      '#           IAttrId/IAttrName/IAttrVal/IAttrType tables as instance attributes -- they',
      '#           differ only in the IAttrId column: instance rows keyed by the instance number',
      '#           (`Values[found]`), class rows keyed by the CLASS NAME (see p55:78',
      '#           `ccls = tokAt(num(2))` and p127:113).  So P314 (a) widens the condition with',
      '#           "or Tok[1] is in ClsName" and (b) makes the body set `iid = Tok[1]` when',
      '#           found == 0.  Verified: _ca 1/6 -> 4/6 (x2/x4/x6), _oo 22/30, func 31/31',
      '#           unchanged.  Still open from item 10: instances get COPIES of mutable class',
      '#           attributes (x1/x5 expect sharing).'
    ].join('\n'));
  fs.writeFileSync('_work/v41/rebuild-old.ps1', r);
  console.log('map var fixed to P314');
} else {
  console.log('WARN: $p176 marker not found');
}
