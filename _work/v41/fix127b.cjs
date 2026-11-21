// second pass: callcls through globals, drop the debug logging from the class branch
const fs = require('fs');
const f = '_work/v41/p127.txt';
let t = fs.readFileSync(f, 'utf8');
const rep = (a, b, tag) => {
  if (!t.includes(a)) throw new Error('anchor missing: ' + tag);
  t = t.split(a).join(b);
  console.log('ok ' + tag);
};

rep("'cspec', 'cpar2', 'cname'];", "'cspec', 'cpar2', 'cname',\n    'cinst', 'cmeth', 'clo', 'chi'];", 'vars2');

// callcls: read the globals
rep("  const cc = newProc('callcls %s %s %s %s %s', ['inst', 'cls', 'meth', 'lo', 'hi']);",
  "  const cc = newProc('callcls', []);", 'callcls def');
rep("    setV('ccls', argOf('cls')),\n    setV('cfull', JOIN(JOIN(VAR('ccls'), txt('.')), argOf('meth'))),",
  "    setV('cfull', JOIN(JOIN(VAR('ccls'), txt('.')), VAR('cmeth'))),", 'callcls cfull');
rep("      setV('self', argOf('inst')),\n      callProc('assign %s %s %s', [txt('self'), argOf('inst'), txt('O')]),",
  "      setV('self', VAR('cinst')),\n      callProc('assign %s %s %s', [txt('self'), VAR('cinst'), txt('O')]),", 'callcls self');
rep("      callProc('calluser %s %s %s', [VAR('cfull'), argOf('lo'), argOf('hi')]),",
  "      callProc('calluser %s %s %s', [VAR('cfull'), VAR('clo'), VAR('chi')]),", 'callcls calluser');
rep("      FAILB(JOIN(JOIN(VAR('ccls'), txt(' has no attribute ')), argOf('meth')))",
  "      FAILB(JOIN(JOIN(VAR('ccls'), txt(' has no attribute ')), VAR('cmeth')))", 'callcls fail');

// call sites
rep(`      callProc('callcls %s %s %s %s %s', [VAR('ctmp'), VAR('cup'), tokAt(ADD(argOf('lo'), num(4))),
        ADD(argOf('lo'), num(6)), SUB(argOf('hi'), num(1))]),`,
  `      setV('cinst', VAR('ctmp')), setV('ccls', VAR('cup')), setV('cmeth', tokAt(ADD(argOf('lo'), num(4)))),
      setV('clo', ADD(argOf('lo'), num(6))), setV('chi', SUB(argOf('hi'), num(1))), callProc('callcls', []),`, 'call super');
rep("            callProc('callcls %s %s %s %s %s', [VAR('cup'), tokAt(argOf('lo')), tokAt(ADD(argOf('lo'), num(2))), num(1), num(0)])",
  "            setV('cinst', VAR('cup')), setV('ccls', tokAt(argOf('lo'))), setV('cmeth', tokAt(ADD(argOf('lo'), num(2)))),\n            setV('clo', num(1)), setV('chi', num(0)), callProc('callcls', [])", 'call A.m noargs');
rep(`            callProc('callcls %s %s %s %s %s', [VAR('cup'), tokAt(argOf('lo')), tokAt(ADD(argOf('lo'), num(2))),
              ADD(VAR('ctmp'), num(1)), SUB(argOf('hi'), num(1))])`,
  `            setV('cinst', VAR('cup')), setV('ccls', tokAt(argOf('lo'))), setV('cmeth', tokAt(ADD(argOf('lo'), num(2)))),
            setV('clo', ADD(VAR('ctmp'), num(1))), setV('chi', SUB(argOf('hi'), num(1))), callProc('callcls', [])`, 'call A.m args');

// drop the leftover debug logging in the class branch
rep("      addTo('DbgL', JOIN(txt('par='), VAR('ctmp'))),\n", "", 'log par');
rep("      addTo('DbgL', JOIN(txt('n='), llen('CQ2'))),\n", "", 'log n');
rep("      addTo('DbgL', JOIN(txt('ELSE '), tokAt(num(3)))),\n", "", 'log else');

fs.writeFileSync(f, t);
console.log('written ' + t.length + ' bytes');
