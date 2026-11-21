
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
for (const t of p.targets) {
  const v = Object.values(t.variables||{}), l = Object.values(t.lists||{}), b = Object.values(t.broadcasts||{});
  if (v.length||l.length||b.length) {
    console.log('=== ' + t.name);
    if (v.length) console.log('  VARS(' + v.length + '): ' + v.map(x=>x[0]).join(' | '));
    if (l.length) console.log('  LISTS(' + l.length + '): ' + l.map(x=>x[0] + '[' + (Array.isArray(x[1])?x[1].length:'?') + ']').join(' | '));
    if (b.length) console.log('  BCAST: ' + b.map(x=>x[0]).join(' | '));
  }
  const cm = Object.values(t.comments||{});
  if (cm.length) { console.log('--- comments of ' + t.name + ':'); for (const c of cm) console.log('   * ' + String(c.text).replace(/\n/g,' \\n ').slice(0,600)); }
}
