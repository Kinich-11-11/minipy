const fs = require('fs');
const p = process.argv[2];
const proj = JSON.parse(fs.readFileSync(p, 'utf8'));
const t = proj.targets.find(x => x.isStage && proj.targets.filter(y=>y.name==='Interpreter').length>0 ? false : x.isStage);
const sb3 = proj.targets.filter(x => x.name !== 'Stage');
console.log('targets:', proj.targets.length, '| names:', proj.targets.map(x=>x.name).join(', ').slice(0,300));
for (const tg of proj.targets) {
  const blocks = tg.blocks || {};
  const nb = Object.keys(blocks).length;
  const nv = Object.keys(tg.variables || {}).length;
  const nl = Object.keys(tg.lists || {}).length;
  console.log(`-- ${tg.name}: blocks=${nb} vars=${nv} lists=${nl} costumes=${(tg.costumes||[]).length}`);
  if (tb(tg).length) {}
}
function tb(tg){return tg.blocks||{}}
// dump variable + list names of Interpreter
const I = proj.targets.find(x=>x.name==='Interpreter');
if (I) {
  const vn = Object.values(I.variables||{}).map(v=>v[0]);
  const ln = Object.values(I.lists||{}).map(v=>v[0]);
  console.log('\n== Interpreter VARIABLE NAMES ('+vn.length+') ==');
  console.log(vn.join(' '));
  console.log('\n== Interpreter LIST NAMES ('+ln.length+') ==');
  console.log(ln.join(' '));
}
