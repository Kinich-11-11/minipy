const fs = require('fs');
const f = '_work/v41/p132.txt';
let t = fs.readFileSync(f, 'utf8');
const rep = (a, b, tag) => {
  if (!t.includes(a)) throw new Error('anchor missing: ' + tag);
  t = t.split(a).join(b);
  console.log('ok ' + tag);
};
rep("const VARS = ['t2x', 't2n', 't2hit', 't2done', 't2off', 't2nm', 't2err'];",
  "const VARS = ['t2x', 't2n', 't2hit', 't2done', 't2off', 't2nm', 't2err', 't2as', 't2i', 't2cp', 't2msg'];", 'vars');
// `except X as e` has to bind e here too: P112's binding lives in the first-clause match path only
rep(`        IFELSE(EQ(VAR('t2hit'), num(1)), [
          setV('tlast', VAR('t2err')),`,
  `        IFELSE(EQ(VAR('t2hit'), num(1)), [
          // bind the name after \`as\` (P112 does this for the first clause): the message is the
          // text after the first ':' of the error text
          setV('t2as', txt('')), setV('t2i', num(1)),
          REPEATU(GT(VAR('t2i'), llen('Tok')), [
            IF(EQ(item('Tok', VAR('t2i')), txt('as')), [setV('t2as', item('Tok', ADD(VAR('t2i'), num(1))))]),
            chgV('t2i', num(1))
          ]),
          IF(NOT(EQ(VAR('t2as'), txt(''))), [
            setV('t2cp', num(0)), setV('t2msg', txt('')), setV('t2i', num(1)),
            REPEATU(GT(VAR('t2i'), lenOf(VAR('t2err'))), [
              IF(AND(EQ(VAR('t2cp'), num(0)), EQ(letterOf(VAR('t2i'), VAR('t2err')), txt(':'))), [setV('t2cp', VAR('t2i'))]),
              chgV('t2i', num(1))
            ]),
            IF(AND(NOT(EQ(VAR('t2cp'), num(0))), NOT(GT(ADD(VAR('t2cp'), num(2)), lenOf(VAR('t2err'))))), [
              callProc('substr %s %s %s', [VAR('t2err'), ADD(VAR('t2cp'), num(2)), lenOf(VAR('t2err'))]),
              setV('t2msg', VAR('ev'))
            ]),
            callProc('assign %s %s %s', [VAR('t2as'), VAR('t2msg'), txt('S')])
          ]),
          setV('tlast', VAR('t2err')),`, 'as binding');
fs.writeFileSync(f, t);
console.log('written ' + t.length);
