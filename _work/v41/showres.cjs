const fs = require('fs');
const f = process.argv[2] || '_pz81';
const r = JSON.parse(fs.readFileSync('_work/v41/' + f + '.out.json', 'utf8'));
for (const x of r) {
  console.log(x.name + ' -> ' + String(x.mini.err || '').slice(0, 130) + ' out=' + JSON.stringify(x.mini.out).slice(0, 30));
}
