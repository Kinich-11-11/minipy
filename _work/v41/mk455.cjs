const fs = require('fs');
let s = fs.readFileSync('_work/v41/p454.txt', 'utf8');
const from = "  // 3) 改写其体";
const to = `  // 2b) 在 Y-IF 之前先登记 "G"（生成器）→ 用同一套游标表
  {
    const itemOf2 = (list, idx) => I('data_itemoflist', { fields: B.LISTF(list), inputs: { INDEX: B.REP(idx, [10, '']) } });
    const idxOf2 = (list, val) => I('data_itemnumoflist', { fields: B.LISTF(list), inputs: { ITEM: B.REP(val, [10, '']) } });
    insertBeforeStmt(first, [
      IF(EQ(VAR('evtype'), txt('G')), [
        setV('gix', idxOf2('GIt', VAR('ev'))),
        IFELSE(EQ(VAR('gix'), num(0)),
          [
            addTo('ItSrc', VAR('ev')),
            addTo('ItPos', num(1)),
            addTo('GIt', VAR('ev')),
            addTo('GId', llen('ItSrc')),
            setV('ev', llen('ItSrc'))
          ],
          [setV('ev', itemOf2('GId', VAR('gix')))]),
        setV('evtype', txt('Y')),
        setV('pending', num(1))
      ])
    ]);
    console.log('[P455] G registration inserted before the Y-if');
  }
  // 3) 改写其体`;
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, to).split('P454').join('P455');
fs.writeFileSync('_work/v41/p455.txt', s);
console.log('wrote p455.txt');