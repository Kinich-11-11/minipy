const fs = require('fs');
let s = fs.readFileSync('_work/v41/p323.txt', 'utf8');
// (a) 不再在 fail %s 里清空（raise 分支记录后紧接着就会调 fail，会被冲掉）
s = s.replace("  const failDef = defIdOf('fail %s');\n  insertBeforeStmt(BL()[failDef].next, [clearL('ErrV'), clearL('ErrT')]);\n  console.log('[P323] (a) fail clears ErrV/ErrT');",
  "  // (a) 注：早期版本在 `fail %s` 开头清空 ErrV/ErrT —— 但 raise 分支记录完实例后**紧接着**就会走 fail，\n  //     于是刚记下的实例立刻被冲掉（实测不生效）。改成**用完再清**（见 (c)）。\n  console.log('[P323] (a) skip clearing in fail (moved to after binding)');");
// (c) 用完清空
s = s.replace("  console.log('[P323] (c) binding prefers the raised instance');",
  "  // 用完就清，避免下次误用\n  spliceAfter(bindCall, chain([clearL('ErrV'), clearL('ErrT')]));\n  console.log('[P323] (c) binding prefers the raised instance, then clears ErrV/ErrT');");
fs.writeFileSync('_work/v41/p323.txt', s);
console.log('rewrote p323 (a)/(c)');