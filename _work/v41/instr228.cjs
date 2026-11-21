// 临时调试驱动 2：在 assignlist 的 unpackto 捷径前插一个 fail，打印 augnames
const fs = require('fs');
const path = '_work/v41/p228.txt';
let s = fs.readFileSync(path, 'utf8');
const old = "      callProc('unpackto %s %s', [VAR('augnames'), VAR('ev')]),";
const nw = "      callProc('fail %s', [VAR('augnames')]),\n" + old;
if (!s.includes(old)) { console.log('NOMATCH'); process.exit(1); }
const i = s.indexOf(old);
fs.writeFileSync(path, s.slice(0, i) + nw + s.slice(i + old.length));
console.log('instrumented');
