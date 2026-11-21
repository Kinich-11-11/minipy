// 临时调试：打印 unpackto 的入口参数与计数结果
const fs = require('fs');
const p = '_work/v41/p228.txt';
let s = fs.readFileSync(p, 'utf8');
const a1 = "    callProc('listlen %s', [ENC()]),";
const a2 = "    badLen('un', 'uncnt'),";
if (!s.includes(a1)) { console.log('MISS entry'); process.exit(1); }
if (!s.includes(a2)) { console.log('MISS badlen'); process.exit(1); }
const entry = [
  "    setV('dbg', txt('N[')),",
  "    setV('dbg', JOIN(VAR('dbg'), NAMES())),",
  "    setV('dbg', JOIN(VAR('dbg'), txt('] E['))),",
  "    setV('dbg', JOIN(VAR('dbg'), ENC())),",
  "    setV('dbg', JOIN(VAR('dbg'), txt(']'))),"
].join('\n');
const counts = [
  "    setV('dbg', JOIN(VAR('dbg'), txt(' cnt='))),",
  "    setV('dbg', JOIN(VAR('dbg'), VAR('uncnt'))),",
  "    setV('dbg', JOIN(VAR('dbg'), txt(' un='))),",
  "    setV('dbg', JOIN(VAR('dbg'), VAR('un'))),",
  "    callProc('fail %s', [VAR('dbg')]),"
].join('\n');
s = s.replace(a1, entry + '\n' + a1);
s = s.replace(a2, counts + '\n' + a2);
s = s.replace("'fcomma', 'fd', 'augrp', 'augnames', 'aui2']", "'fcomma', 'fd', 'augrp', 'augnames', 'aui2', 'dbg']");
fs.writeFileSync(p, s);
console.log('instrumented');
