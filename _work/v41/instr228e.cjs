// 临时调试：在 assignlist 的**所有** eval 调用之后打印 error / ev / evtype
const fs = require('fs');
const p = '_work/v41/p228.txt';
let s = fs.readFileSync(p, 'utf8');
const anchor = "  const flatNx = BL()[flatWalk].next;";
const ins = [
  "  const alEvals = find(al, (b) => b.opcode === 'procedures_call' && b.mutation.proccode === 'eval %s %s');",
  "  for (const alEval of alEvals) spliceAfter(alEval, chain([",
  "    setV('dbg', txt('ERR[')),",
  "    setV('dbg', JOIN(VAR('dbg'), VAR('error'))),",
  "    setV('dbg', JOIN(VAR('dbg'), txt('] vt['))),",
  "    setV('dbg', JOIN(VAR('dbg'), VAR('evtype'))),",
  "    setV('dbg', JOIN(VAR('dbg'), txt('] ev['))),",
  "    setV('dbg', JOIN(VAR('dbg'), VAR('ev'))),",
  "    setV('dbg', JOIN(VAR('dbg'), txt('] grp['))),",
  "    setV('dbg', JOIN(VAR('dbg'), VAR('augrp'))),",
  "    setV('dbg', JOIN(VAR('dbg'), txt('] nm['))),",
  "    setV('dbg', JOIN(VAR('dbg'), VAR('augnames'))),",
  "    callProc('fail %s', [VAR('dbg')])",
  "  ]));",
  ""
].join('\n');
if (!s.includes(anchor)) { console.log('MISS'); process.exit(1); }
if (!s.includes("'fcomma', 'fd', 'augrp', 'augnames', 'aui2']")) { console.log('MISS vars'); process.exit(1); }
s = s.replace("'fcomma', 'fd', 'augrp', 'augnames', 'aui2']", "'fcomma', 'fd', 'augrp', 'augnames', 'aui2', 'dbg']");
fs.writeFileSync(p, s.replace(anchor, ins + anchor));
console.log('instrumented');
