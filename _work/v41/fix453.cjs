const fs = require('fs');
let s = fs.readFileSync('_work/v41/p453.txt', 'utf8');
s = s.replace("for (const n of ['lgi']) if (taken.has(n)) throw new Error('[P453] var taken: ' + n);\n  newVar('lgi', 0);",
              "for (const n of ['lgi', 'lgn']) if (taken.has(n)) throw new Error('[P453] var taken: ' + n);\n  newVar('lgi', 0); newVar('lgn', 0);");
fs.writeFileSync('_work/v41/p453.txt', s);
console.log('lgn var added');