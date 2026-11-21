// bracket balance per line, ignoring string literals and line comments
const fs = require('fs');
const lines = fs.readFileSync(process.argv[2], 'utf8').split(/\r?\n/);
let bal = 0;
lines.forEach((line, i) => {
  let inStr = null;
  for (let k = 0; k < line.length; k++) {
    const c = line[k];
    if (inStr) {
      if (c === '\\') { k++; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === "'" || c === '"') { inStr = c; continue; }
    if (c === '/' && line[k + 1] === '/') break;
    if (c === '(' || c === '[' || c === '{') bal++;
    else if (c === ')' || c === ']' || c === '}') bal--;
  }
  console.log((i + 1) + ': bal=' + bal);
});
console.log('final balance ' + bal);
