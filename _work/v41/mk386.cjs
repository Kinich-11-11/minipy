const fs = require('fs');
let s = fs.readFileSync('_work/v41/p384.txt', 'utf8');
// 1) 换条件 + 新增 ltlo 变量
s = s.replace("  const cond = NOT(EQ(item('Tok', argOf('hi')), txt(',')));",
  "  const cond = NOT(GT(VAR('ltlo'), argOf('hi')));   // 尾段非空才求值");
// 2) 声明变量
const takenLine = "  const BB = T(IT).blocks;";
if (!s.includes(takenLine)) { console.log('MISS BB'); process.exit(1); }
s = s.replace(takenLine, [
  "  const taken = new Set(Object.values(T(IT).variables).map((x) => x[0]));",
  "  if (taken.has('ltlo')) throw new Error('[P386] var taken');",
  "  newVar('ltlo', 0);",
  takenLine
].join('\n'));
// 3) 在 gate 之前算 ltlo；并把尾部 eval 的第一个实参换成 ltlo
const gateLine = "  const gate = IF(cond, []);";
if (!s.includes(gateLine)) { console.log('MISS gate'); process.exit(1); }
s = s.replace(gateLine, [
  "  // 尾段起点 = 最后一个顶层逗号 + 1；没有逗号时按 hi+1（空尾段）处理",
  "  const pre = [",
  "    setV('ltlo', ADD(argOf('hi'), num(1))),",
  "    IF(GT(VAR('l6n'), num(0)), [setV('ltlo', ADD(item('LComm', VAR('l6n')), num(1)))])",
  "  ];",
  "  insertBeforeStmt(E, pre);",
  "  // 把尾部 eval 的第一个实参改成 ltlo（原来用的是 lplo，尾随逗号时并不指向最后一段）",
  "  {",
  "    const ks = Object.keys(BB[E].inputs);",
  "    BB[E].inputs[ks[0]] = B.REP(VAR('ltlo'), [4, '0']);",
  "    console.log('[P386] tail eval arg1 -> ltlo (' + ks[0] + ')');",
  "  }",
  gateLine
].join('\n'));
s = s.split('P384').join('P386');
fs.writeFileSync('_work/v41/p386.txt', s);
console.log('wrote p386.txt');
