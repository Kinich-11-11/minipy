const fs = require('fs');
let s = fs.readFileSync('_work/v41/p462.txt', 'utf8');
const from = `    IF(EQ(item('Tok', num(2)), txt('from')), [
      callProc('eval %s %s', [num(3), VAR('count')]),
      setV('yfv', VAR('ev')),
      rawCall('listlen %s', [VAR('yfv')]),
      setV('yfn', VAR('ev')),
      setV('yfk', num(1)),
      REPEATU(GT(VAR('yfk'), VAR('yfn')), [
        rawCall('listitem %s %s', [VAR('yfv'), VAR('yfk')]),
        addTo('GYield', JOIN(JOIN(VAR('lsep'), VAR('evtype')), VAR('ev'))),
        chgV('yfk', num(1))
      ])
    ])`;
const to = `    IF(EQ(item('Tok', num(2)), txt('from')), [
      callProc('eval %s %s', [num(3), VAR('count')]),
      // 若被迭代的是**生成器调用**（"G"），它的项在调用过程中**已经进了 GYield** ⇒ 不能再加一遍
      IF(NOT(EQ(VAR('evtype'), txt('G'))), [
        setV('yfv', VAR('ev')),
        rawCall('listlen %s', [VAR('yfv')]),
        setV('yfn', VAR('ev')),
        setV('yfk', num(1)),
        REPEATU(GT(VAR('yfk'), VAR('yfn')), [
          rawCall('listitem %s %s', [VAR('yfv'), VAR('yfk')]),
          addTo('GYield', JOIN(JOIN(VAR('lsep'), VAR('evtype')), VAR('ev'))),
          chgV('yfk', num(1))
        ])
      ])
    ])`;
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p462.txt', s.replace(from, to));
console.log('G guard added');