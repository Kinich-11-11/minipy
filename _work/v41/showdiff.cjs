const fs = require('fs');
const f = process.argv[2];
const r = JSON.parse(fs.readFileSync('_work/v41/' + f + '.out.json', 'utf8'));
for (const x of r) {
  if (x.same) continue;
  console.log(x.name + '\n  mini=' + JSON.stringify(x.mini.out) + '\n  py  =' + JSON.stringify(x.py) + '\n  err =' + String(x.mini.err || '').slice(0, 70));
}
