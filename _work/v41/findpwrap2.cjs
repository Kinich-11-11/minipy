const fs = require('fs');
const files = ['_work/v41/project.json', '_work/v41/_p250proj.json', '_work/v41/_p251proj.json', '_work/v41/_tz48proj.json'];
for (const f of files) {
  if (!fs.existsSync(f)) { console.log(f + ': missing'); continue; }
  const p = JSON.parse(fs.readFileSync(f, 'utf8'));
  let total = 0;
  const names = [];
  for (const t of p.targets) {
    const j = JSON.stringify(t);
    total += j.split('pwrap').length - 1;
    const vars = t.variables;
    const list = Array.isArray(vars) ? vars : Object.values(vars || {});
    for (const v of list) if (String(v[0]).indexOf('pw') === 0 || String(v[0]).indexOf('nz') === 0) names.push(v[0]);
  }
  console.log(f + ': pwrap=' + total + ' vars=' + JSON.stringify(names.slice(0, 12)));
}
