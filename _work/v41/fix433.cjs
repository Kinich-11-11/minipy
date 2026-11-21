const fs = require('fs');
let s = fs.readFileSync('_work/v41/p433.txt', 'utf8');
const from = `    findSelf(BB[def].next);
    if (!setSelf) throw new Error('[P433] \`self = iid\` not found in ' + procName);
    console.log('[P433] ' + procName + ' self-assign=' + setSelf);
    insertBeforeStmt(setSelf, [
      IF(AND(EQ(VAR('narg'), num('0')), NOT(GT(argOf('lo'), argOf('hi')))), [
        callProc('eval %s %s', [argOf('lo'), argOf('hi')]),
        setV('vmA', VAR('ev')),
        setV('vmT', VAR('evtype')),
        setV('vmOn', num(1)),
        setV('lo', num(1)),
        setV('hi', num(0))
      ])
    ]);`;
const to = `    findSelf(BB[def].next);
    if (!setSelf) throw new Error('[P433] self=iid not found in ' + procName);
    // 取该过程的形参名（第 2、3 个 = lo/hi）
    let names = null;
    for (const id of Object.keys(BB)) {
      const b = BB[id];
      if (b.opcode !== 'procedures_prototype' || !b.mutation) continue;
      if (String(b.mutation.proccode) !== procName) continue;
      names = JSON.parse(b.mutation.argumentnames);
      break;
    }
    if (!names || names.length < 2) throw new Error('[P433] cannot read params of ' + procName);
    const pLo = names[0], pHi = names[1];
    console.log('[P433] ' + procName + ' self-assign=' + setSelf + ' params=' + names.join(','));
    insertBeforeStmt(setSelf, [
      IF(AND(EQ(VAR('narg'), num('0')), NOT(GT(argOf(pLo), argOf(pHi)))), [
        callProc('eval %s %s', [argOf(pLo), argOf(pHi)]),
        setV('vmA', VAR('ev')),
        setV('vmT', VAR('evtype')),
        setV('vmOn', num(1)),
        setV('lo', num(1)),
        setV('hi', num(0))
      ])
    ]);`;
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p433.txt', s.replace(from, to));
console.log('param names read from prototypes');