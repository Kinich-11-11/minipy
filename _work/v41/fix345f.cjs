const fs = require('fs');
let s = fs.readFileSync('_work/v41/p345.txt', 'utf8');
const from = "      setV('p345fn', VAR('ev')),";
const to = "      setV('p345fn', item('FnName', VAR('ev'))),   // 与 #3 那条链式处理一致：用 FnName 查表拿名字";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p345.txt', s.replace(from, to));
console.log('p345fn now uses FnName[ev]');