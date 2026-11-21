const fs = require('fs');
let s = fs.readFileSync('_work/v41/p445.txt', 'utf8');
s = s.replace("for (const n of ['lcres', 'lcdone', 'lcscan', 'ti']) if (taken.has(n)) throw new Error('[P445] var taken: ' + n);\n  newVar('lcres', ''); newVar('lcdone', 0); newVar('lcscan', 1); newVar('ti', 1);",
              "for (const n of ['lcres', 'lcdone', 'lcscan']) if (taken.has(n)) throw new Error('[P445] var taken: ' + n);\n  newVar('lcres', ''); newVar('lcdone', 0); newVar('lcscan', 1);   // 复用已存在的 ti 作循环变量");
fs.writeFileSync('_work/v41/p445.txt', s);
console.log('reuse ti');