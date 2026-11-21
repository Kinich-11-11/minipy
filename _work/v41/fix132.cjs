const fs = require('fs');
const f = '_work/v41/p132.txt';
let t = fs.readFileSync(f, 'utf8');
const start = t.indexOf("  const nextClause = IF(EQ(VAR('tcl'), num(0)), [");
const end = t.indexOf("  insertBeforeStmt(first, [nextClause]);");
if (start < 0 || end < 0) throw new Error('block not found');
const block = `  const nextClause = IF(EQ(VAR('tcl'), num(0)), [
    // tokenize() bails out while \`error\` is set -- it is the "something went wrong" flag -- so the
    // walk has to hide the error while it reads the following clause lines
    setV('t2err', VAR('error')),
    setV('t2x', item('Elses', SUB(last('TryHand'), num(1)))),
    setV('t2done', num(0)),
    REPEATU(OR(EQ(VAR('t2done'), num(1)), OR(EQ(VAR('t2x'), num(0)), GT(VAR('t2x'), last('TryEnd')))), [
      setV('error', txt('')),
      callProc('tokenize %s', [item('Code', VAR('t2x'))]),
      setV('error', VAR('t2err')),
      IFELSE(EQ(item('Tok', num(1)), txt('except')), [
        IFELSE(GT(llen('Tok'), num(2)), [setV('t2n', item('Tok', num(2)))], [setV('t2n', txt(''))]),
        setV('t2hit', num(0)),
        IFELSE(OR(EQ(VAR('t2n'), txt('')), EQ(VAR('t2n'), txt('Exception'))), [
          setV('t2hit', num(1))
        ], [
          callProc('sprefix %s %s %s', [VAR('error'), VAR('t2n'), txt('startswith')]),
          IF(EQ(VAR('ev'), num(1)), [setV('t2hit', num(1))]),
          IF(EQ(VAR('t2hit'), num(0)), [
            ...subclassHit()
          ])
        ]),
        IFELSE(EQ(VAR('t2hit'), num(1)), [
          setV('tlast', VAR('t2err')),
          setV('error', txt('')),
          setV('pc', ADD(VAR('t2x'), num(1))),
          setV('t2done', num(1))
        ], [
          setV('t2x', item('Elses', VAR('t2x')))
        ])
      ], [
        setV('t2x', num(0))
      ]),
      // put a line's tokens back (the interpreter re-tokenizes as it goes, this is belt and braces)
      setV('error', txt('')),
      callProc('tokenize %s', [item('Code', VAR('pc'))]),
      setV('error', VAR('t2err')),
      IF(EQ(VAR('t2done'), num(1)), [setV('error', txt(''))])
    ])
  ]);
`;
t = t.slice(0, start) + block + t.slice(end);
// drop the debug list/logs
t = t.replace("  const last = (l) => item(l, txt('last'));\n  B.addList(IT, 'DbgL', []);", "  const last = (l) => item(l, txt('last'));");
t = t.replace(/\n *addTo\('DbgL'[^\n]*\n/g, '\n');
fs.writeFileSync(f, t);
console.log('written ' + t.length + ' dbg=' + (t.includes('DbgL') ? 'yes' : 'no'));
