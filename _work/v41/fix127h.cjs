// fix the Class.m(inst, args) hook: scan for the depth-0 comma first, then evaluate ONLY the
// instance argument (evaluating the whole list packed the extra arguments into `cinst`)
const fs = require('fs');
const f = '_work/v41/p127.txt';
let t = fs.readFileSync(f, 'utf8');
const rep = (a, b, tag) => {
  if (!t.includes(a)) throw new Error('anchor missing: ' + tag);
  t = t.split(a).join(b);
  console.log('ok ' + tag);
};
rep("  B.addList(IT, 'CQ2', []);\n  B.addList(IT, 'DbgL', []);", "  B.addList(IT, 'CQ2', []);", 'drop dbgl');

const start = t.indexOf("  insertBeforeStmt(mcIf[0], [");
const end = t.indexOf("  console.log('[P127] super() and Class.m(inst) routed through callcls');");
if (start < 0 || end < 0) throw new Error('hook block not found');
const hook = `  insertBeforeStmt(mcIf[0], [
    IF(AND(EQ(tokAt(ADD(argOf('lo'), num(1))), txt('.')), EQ(tokAt(argOf('hi')), txt(')'))), [
      setV('cname', tokAt(argOf('lo'))), callProc('iscls', []),
      IF(EQ(VAR('ev'), num(1)), [
        // The first argument is the instance; anything after the first depth-0 comma is the
        // method's own argument list.  Find that comma *before* evaluating anything: evaluating
        // the whole list would pack all the arguments into the value that becomes \`self\`.
        setV('csi', ADD(argOf('lo'), num(4))), setV('cch', num(0)), setV('ctmp', num(0)),
        REPEATU(GT(VAR('csi'), SUB(argOf('hi'), num(1))), [
          IF(OR(EQ(tokAt(VAR('csi')), txt('(')), OR(EQ(tokAt(VAR('csi')), txt('[')), EQ(tokAt(VAR('csi')), txt('{')))), [chgV('cch', num(1))]),
          IF(OR(EQ(tokAt(VAR('csi')), txt(')')), OR(EQ(tokAt(VAR('csi')), txt(']')), EQ(tokAt(VAR('csi')), txt('}')))), [chgV('cch', num(-1))]),
          IF(AND(EQ(VAR('cch'), num(0)), AND(EQ(VAR('ctmp'), num(0)), EQ(tokAt(VAR('csi')), txt(',')))), [
            setV('ctmp', VAR('csi'))
          ]),
          chgV('csi', num(1))
        ]),
        IFELSE(EQ(VAR('ctmp'), num(0)), [
          callProc('eval %s %s', [ADD(argOf('lo'), num(4)), SUB(argOf('hi'), num(1))]),
          IF(EQ(VAR('error'), txt('')), [
            setV('cup', VAR('ev')),
            setV('cinst', VAR('cup')), setV('ccls', tokAt(argOf('lo'))), setV('cmeth', tokAt(ADD(argOf('lo'), num(2)))),
            setV('clo', num(1)), setV('chi', num(0)), callProc('callcls', [])
          ])
        ], [
          callProc('eval %s %s', [ADD(argOf('lo'), num(4)), SUB(VAR('ctmp'), num(1))]),
          IF(EQ(VAR('error'), txt('')), [
            setV('cup', VAR('ev')),
            setV('cinst', VAR('cup')), setV('ccls', tokAt(argOf('lo'))), setV('cmeth', tokAt(ADD(argOf('lo'), num(2)))),
            setV('clo', ADD(VAR('ctmp'), num(1))), setV('chi', SUB(argOf('hi'), num(1))), callProc('callcls', [])
          ])
        ]),
        chgV('fnlimit', num(-1)),
        STOPTHIS()
      ])
    ])
  ]);
`;
t = t.slice(0, start) + hook + t.slice(end);
fs.writeFileSync(f, t);
console.log('written ' + t.length);
