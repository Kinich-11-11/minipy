const fs = require('fs');
let s = fs.readFileSync('_work/v41/p429.txt', 'utf8');
const from = `      IF(EQ(VAR('vmOn'), num(1)), [
        IF(GT(llen('UArgV'), num(0)), [
          replaceItem('UArgV', num(1), VAR('vmA')),
          replaceItem('UArgT', num(1), VAR('vmT'))
        ]),
        setV('vmOn', num(0))
      ])`;
const to = `      IF(EQ(VAR('vmOn'), num(1)), [
        IFELSE(EQ(llen('UArgV'), num(0)),
          [ addTo('UArgV', VAR('vmA')), addTo('UArgT', VAR('vmT')) ],
          [ replaceItem('UArgV', num(1), VAR('vmA')), replaceItem('UArgT', num(1), VAR('vmT')) ]),
        setV('vmOn', num(0))
      ])`;
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p429.txt', s.replace(from, to));
console.log('append-or-replace installed');