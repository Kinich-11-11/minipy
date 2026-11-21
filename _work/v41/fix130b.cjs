// P130 fixes: accept a set (P114 let sorted take 'E'), and support a bare builtin name as the key
const fs = require('fs');
const f = '_work/v41/p130.txt';
let t = fs.readFileSync(f, 'utf8');
const rep = (a, b, tag) => {
  if (!t.includes(a)) throw new Error('anchor missing: ' + tag);
  t = t.split(a).join(b);
  console.log('ok ' + tag);
};
rep("'p4ks', 'p4kst', 'p4res', 'p4rt'];", "'p4ks', 'p4kst', 'p4res', 'p4rt', 'p4bi', 'p4bin'];", 'vars');
rep("  for (const v of VARS) newVar(v, 0);", "  for (const v of VARS) newVar(v, 0);", 'noop');
// (1) the guard accepts a set too (P114: sorted({3,1,2}) is a list in CPython)
rep(`          IF(NOT(EQ(VAR('evtype'), txt('L'))), [
            FAIL(txt('TypeError: sorted() requires a list')),
            ...bale()
          ]),`,
  `          IF(NOT(OR(EQ(VAR('evtype'), txt('L')), EQ(VAR('evtype'), txt('E')))), [
            FAIL(txt('TypeError: sorted() requires a list')),
            ...bale()
          ]),`, 'set ok');
// (2) a function value is an FnName index; a bare name that is not a value may be a builtin
rep(`            callProc('eval %s %s', [VAR('p4klo'), VAR('p4khi')]),
            IF(EQ(VAR('error'), txt('')), [
              // a function value is the index into FnName (p85.txt); calluser wants the name
              setV('p4fn', item('FnName', VAR('ev'))),
              callProc('srtkey', []),
              setV('p4out', VAR('ev'))
            ])`,
  `            setV('p4bi', num(0)),
            callProc('eval %s %s', [VAR('p4klo'), VAR('p4khi')]),
            IFELSE(EQ(VAR('error'), txt('')), [
              // a function value is the index into FnName (p85.txt); calluser wants the name
              setV('p4fn', item('FnName', VAR('ev')))
            ], [
              // \`key=len\` and friends: a bare builtin name is not a value in this interpreter, so
              // keep the name and let callfn dispatch it -- only for a single-token key
              IF(EQ(VAR('p4khi'), VAR('p4klo')), [
                setV('p4bin', tokAt(VAR('p4klo'))),
                setV('p4bi', num(1)),
                setV('error', txt(''))
              ])
            ]),
            IF(EQ(VAR('error'), txt('')), [
              callProc('srtkey', []),
              setV('p4out', VAR('ev'))
            ])`, 'builtin key');
// (3) callval dispatches through callfn for a builtin name
rep(`    callProc('calluser %s %s %s', [VAR('p4fn'), num(1), llen('Tok')]),
    // put the current line's tokens back (p112.txt does exactly this)`,
  `    IFELSE(EQ(VAR('p4bi'), num(1)), [
      callProc('callfn %s %s %s', [VAR('p4bin'), num(1), llen('Tok')])
    ], [
      callProc('calluser %s %s %s', [VAR('p4fn'), num(1), llen('Tok')])
    ]),
    // put the current line's tokens back (p112.txt does exactly this)`, 'callval dispatch');
fs.writeFileSync(f, t);
console.log('written ' + t.length);
