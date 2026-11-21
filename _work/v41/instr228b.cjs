// 临时调试驱动 4：确认 assignlist 是否被调用
const fs = require('fs');
const path = '_work/v41/p228.txt';
let s = fs.readFileSync(path, 'utf8');
const old = "  insertBeforeStmt(flatWalk, [\n    setV('augrp', num(0)),";
const nw = "  insertBeforeStmt(flatWalk, [\n    callProc('fail %s', [txt('ALHIT')]),\n    setV('augrp', num(0)),";
if (!s.includes(old)) { console.log('NOMATCH'); process.exit(1); }
fs.writeFileSync(path, s.replace(old, nw));
console.log('instrumented');
