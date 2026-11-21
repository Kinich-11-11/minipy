const fs = require('fs');
const p = '_work/v41/p248.txt';
let s = fs.readFileSync(p, 'utf8');
// 去掉调试行
const dbgLine = "    console.log('[P248dbg] assign call ' + id + ' vals=' + vals.length + ' v1=' + JSON.stringify(vals[0]).slice(0, 60) + ' v2=' + JSON.stringify(vals[1]).slice(0, 60));\n";
if (!s.includes(dbgLine)) { console.log('MISS dbg'); process.exit(1); }
s = s.replace(dbgLine, '');
// 修 asVarName：内联变量可能嵌在 [3,[12,'ev',id],shadow] 里
const from = "      if (v[0] === 12) return v[1];";
const to = [
  "      if (v[0] === 12) return v[1];",
  "      if (Array.isArray(v[1]) && v[1][0] === 12) return v[1][1];   // [3,[12,'ev',id],shadow]"
].join('\n');
if (!s.includes(from)) { console.log('MISS asVarName'); process.exit(1); }
s = s.replace(from, to);
fs.writeFileSync(p, s);
console.log('ok');
