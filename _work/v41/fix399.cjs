const fs = require('fs');
let s = fs.readFileSync('_work/v41/p399.txt', 'utf8');
const from = [
  "    IF(EQ(VAR('mkdep'), num(0)), [",
  "      IF(EQ(item('Tok', VAR('mkpos')), txt(',')), [setV('mmclast', VAR('mkpos'))])",
  "    ]),",
  "    IF(EQ(item('Tok', VAR('mkpos')), txt('default')), [",
  "      IF(EQ(item('Tok', ADD(VAR('mkpos'), num(1))), txt('=')), [",
  "        setV('mmdf', VAR('mkpos')),",
  "        setV('mmdc', VAR('mmclast'))",
  "      ])",
  "    ])"
].join('\n');
const to = [
  "    IF(EQ(VAR('ed'), num(0)), [",
  "      IF(EQ(item('Tok', VAR('ek')), txt(',')), [setV('mmclast', VAR('ek'))])",
  "    ]),",
  "    IF(EQ(item('Tok', VAR('ek')), txt('default')), [",
  "      IF(EQ(item('Tok', ADD(VAR('ek'), num(1))), txt('=')), [",
  "        setV('mmdf', VAR('ek')),",
  "        setV('mmdc', VAR('mmclast'))",
  "      ])",
  "    ])"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p399.txt', s.replace(from, to));
console.log('fixed to use ek/ed');