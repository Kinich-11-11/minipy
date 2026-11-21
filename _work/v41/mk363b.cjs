const fs = require('fs');
let s = fs.readFileSync('_work/v41/p360.txt', 'utf8');
s = s.replace("  const BB = T(IT).blocks;", "  if (taken.has('p344skip')) throw new Error('[P363] var taken');\n  newVar('p344skip', 0);\n  const BB = T(IT).blocks;");
const head = "setV('p344close', argOf('hi')),";
if (!s.includes(head)) { console.log('MISS head'); process.exit(1); }
s = s.replace(head, "setV('p344skip', num(0)),\n    " + head);
const st = "          stopThis()";
const i = s.indexOf(st);
if (i < 0) { console.log('MISS stopThis'); process.exit(1); }
s = s.slice(0, i) + "          setV('p344skip', num(1)),\n" + s.slice(i);
const target = "    b.inputs[keys[2]] = B.REP(SUB(argOf('hi'), num(1)), [4, '0']);   // 全新块，避免共用/悬空";
if (!s.includes(target)) { console.log('MISS target'); process.exit(1); }
s = s.replace(target, [
  "    {",
  "      const nx = BB[id].next;",
  "      BB[id].next = null;",
  "      insertBeforeStmt(id, [IF(EQ(VAR('p344skip'), num(0)), [id])]);",
  "      const w = BB[id].parent;",
  "      if (nx) { BB[w].next = nx; BB[nx].parent = w; }",
  "    }",
  target
].join('\n'));
s = s.split('P360').join('P363');
fs.writeFileSync('_work/v41/p363.txt', s);
console.log('wrote p363.txt');