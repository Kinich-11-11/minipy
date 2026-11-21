const fs = require('fs');
const f = '_work/v41/p131.txt';
let t = fs.readFileSync(f, 'utf8');
const rep = (a, b, tag) => {
  if (!t.includes(a)) throw new Error('anchor missing: ' + tag);
  t = t.split(a).join(b);
  console.log('ok ' + tag);
};
rep("  const bale = () => [chgV('fnlimit', num(-1)), STOPTHIS()];",
  "  const bale = () => [chgV('fnlimit', num(-1)), STOPTHIS()];\n  B.addList(IT, 'DbgL', []);", 'dbgl');
rep(`    setV('p5i', VAR('p5from')),
    REPEATU(GT(VAR('p5i'), VAR('p5to')), [
      IF(NOT(EQ(tok(VAR('p5i')), txt(','))), [addTo('P5Names', tok(VAR('p5i')))]),
      chgV('p5i', num(1))
    ])`,
  `    setV('p5i', VAR('p5from')),
    addTo('DbgL', JOIN(txt('range '), JOIN(VAR('p5from'), JOIN(txt('..'), VAR('p5to'))))),
    REPEATU(GT(VAR('p5i'), VAR('p5to')), [
      IF(NOT(EQ(tok(VAR('p5i')), txt(','))), [addTo('P5Names', tok(VAR('p5i')))]),
      chgV('p5i', num(1))
    ]),
    addTo('DbgL', JOIN(txt('names='), item('P5Names', num(1))))`, 'collect log');
rep(`        setV('ev', VAR('p5any')), setV('evtype', txt('B'))
      ], [
        FAIL(txt('TypeError: issubclass expected 2 arguments, got 1')),`,
  `        setV('ev', VAR('p5any')), setV('evtype', txt('B')),
        addTo('DbgL', JOIN(txt('issub '), JOIN(VAR('p5a'), JOIN(txt('/'), VAR('ev')))))
      ], [
        FAIL(txt('TypeError: issubclass expected 2 arguments, got 1')),`, 'issub log');
rep(`          setV('ev', VAR('p5any')), setV('evtype', txt('B'))
        ]),
        ...bale()
      ])
    ])`,
  `          setV('ev', VAR('p5any')), setV('evtype', txt('B')),
          addTo('DbgL', JOIN(txt('isinst '), JOIN(VAR('p5any'), JOIN(txt(' n='), item('P5Names', num(1))))))
        ]),
        ...bale()
      ])
    ])`, 'isinstance log');
fs.writeFileSync(f, t);
console.log('written ' + t.length);
