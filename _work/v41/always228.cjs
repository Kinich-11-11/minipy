// 临时调试：把捷径条件改成恒真，判断卡点到底是条件还是可达性
const fs = require('fs');
const p = '_work/v41/p228.txt';
let s = fs.readFileSync(p, 'utf8');
const old = "      IF(EQ(VAR('augrp'), num(1)), [";
const nw = "      IF(EQ(VAR('augrp'), VAR('augrp')), [";
if (!s.includes(old)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(old, nw));
console.log('patched to always-true');
