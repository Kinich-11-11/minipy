const fs = require('fs');
const p = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/index.js';
let s = fs.readFileSync(p, 'utf8');
const a = "  'FrAux', 'FrGlob', 'HdFr', 'HdSt', 'HdPc', 'Big', 'WkKind', 'WkVal', 'WB', 'PosQ', 'JsSt', 'JsKind', 'JsKey', 'Big',";
const b = "  'FrAux', 'FrGlob', 'HdFr', 'HdSt', 'HdPc', 'Big', 'WkKind', 'WkVal', 'WB', 'PosQ', 'JsSt', 'JsKind', 'JsKey',";
const c = "  'NlFr', 'NlName', 'CSst',";
const lf = String.fromCharCode(10), crlf = String.fromCharCode(13) + lf;
let n = s.split(a).join(b + lf + c);
if (n === s) { n = s.split(a.split(lf).join(crlf)).join((b + lf + c).split(lf).join(crlf)); }
if (n === s) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, n);
console.log('lists added');