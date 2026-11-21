const fs = require('fs');
for (const f of ['p605.txt', 'p607.txt', 'p608.txt']) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  let bal = 0;
  for (let i = 0; i < lines.length; i++) {
    let l = lines[i];
    const ci = l.indexOf('//');
    if (ci >= 0 && !l.slice(0, ci).includes("'")) l = l.slice(0, ci);
    l = l.replace(/'(?:[^'\\]|\\.)*'/g, 'S');
    for (const ch of l) { if ('([{'.includes(ch)) bal++; if (')]}'.includes(ch)) bal--; }
    if (bal < 0) { console.log(f, 'negative at line', i + 1, JSON.stringify(l.slice(0, 150))); bal = 0; }
  }
  console.log(f, 'final balance', bal);
}
