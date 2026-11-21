const fs = require('fs');
const NL = String.fromCharCode(10);
const files = ['ast.js', 'astutil.js', 'parse.js', 'pexpr.js'].map(f => 'D:/编程/scratch/ai/minipython/_work/v5/kernel/' + f);
let total = 0;
for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');
  let n = 0;
  // every node creator must keep NdG the same length as the node table, otherwise a
  // later L.setAt(NdG, id, ...) silently appends at the wrong index.
  s = s.split("S.chg('nTop', E.num(1)),").join("S.chg('nTop', E.num(1)), S.ladd('NdG', E.str('')),");
  const before = (fs.readFileSync(f, 'utf8').match(/S\.chg\('nTop', E\.num\(1\)\),/g) || []).length;
  n = before;
  fs.writeFileSync(f, s);
  console.log(f.split('/').pop() + ': ' + n + ' creators patched');
  total += n;
}
console.log('total', total);