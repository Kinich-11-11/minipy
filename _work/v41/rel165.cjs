const fs = require('fs');
// 1) 把 _sm 里的 m20 拆成两条（sorted(d.items()) 已修，另一条仍差 key 传递）
let t = fs.readFileSync('_work/v41/_sm.txt', 'utf8');
const old = `### m20 dict items sorted
d = {'b': 1, 'a': 2}
print(sorted(d.items()), sorted(d.items(), key=lambda kv: -kv[1]))`;
const neu = `### m20a dict items sorted
d = {'b': 1, 'a': 2}
print(sorted(d.items()))
### m20b dict items sorted key
d = {'b': 1, 'a': 2}
print(sorted(d.items(), key=lambda kv: -kv[1]))`;
if (t.includes(old)) { t = t.replace(old, neu); fs.writeFileSync('_work/v41/_sm.txt', t); console.log('probe split ok'); }
else console.log('probe already split?');
// 2) 版本号
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.164.sb3 (newest)', 'MiniPy_v4.165.sb3 (newest)')
     .replace(/MiniPy_v4\.164\.sb3'/g, "MiniPy_v4.165.sb3'")
     .replace('MiniPy v4.164 - built', 'MiniPy v4.165 - built');
fs.writeFileSync('_work/v41/head.txt', h);
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p164 = 'P282'";
if (!r.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const ins = [
  '#   v4.165 = +P283 (dict views are lists).  `sorted({"b":1,"a":2}.items())` died with',
  '#           "TypeError: sorted() requires a list".  `d.keys()/values()/items()` answer a VIEW',
  '#           whose CONTENTS are already list-encoded (P163 does `dictkeys %s` and tags it "K" /',
  '#           "V" / "I"), so every check that demands L or E rejected it.  The patch inserts',
  '#           `if evtype in ("K","V","I"): evtype = "L"` BEFORE each of the 6 "requires a list"',
  '#           guards (they were already wrapped by P276, so it had to go before the wrapper).',
  '#           KNOWN REMAINING: `sorted(view_or_dict, key=lambda ...)` still ignores the key --',
  '#           same residual family as sorted(dict, key=<builtin>).)',
  "$p165 = 'P283'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
