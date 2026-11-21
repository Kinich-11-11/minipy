const fs = require('fs');
let s = fs.readFileSync('_work/v41/p347.txt', 'utf8');
const from = "          setV('p345fn', item('FnName', VAR('ev'))),";
const to = "          setV('p345fn', item('FnName', VAR('ev'))),\n          setV('mode', txt('0')),   // callfn 按 mode 分派；值调用需要 \"0\"";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p356.txt', s.replace(from, to).split('P347').join('P356'));
console.log('wrote p356.txt (mode=0 before second call)');