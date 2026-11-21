
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
// py details
for (const t of p.targets) {
  const v = Object.values(t.variables||{}), l = Object.values(t.lists||{}), b = Object.values(t.broadcasts||{});
  console.log('=== ' + t.name);
  if (v.length) console.log('  VARS(' + v.length + '): ' + v.slice(0,80).map(x=>x[0]+'='+JSON.stringify(x[1]).slice(0,30)).join(' | '));
  if (l.length) console.log('  LISTS(' + l.length + '): ' + l.map(x=>x[0]+'['+(Array.isArray(x[1])?x[1].length:'?')+']').join(' | '));
  if (b.length) console.log('  BCAST: ' + b.map(x=>x[0]).join(' | '));
  const cm = Object.values(t.comments||{});
  for (const c of cm) console.log('  COMMENT: ' + String(c.text).replace(/\n/g,' \\n ').slice(0,800));
  // hats
  const hats = [];
  for (const id in t.blocks) { const bl=t.blocks[id]; if (bl.topLevel && bl.opcode.startsWith('event_')) hats.push(bl.opcode + (bl.fields&&bl.fields.BROADCAST_OPTION?' :: '+bl.fields.BROADCAST_OPTION[0]:'') + (bl.fields&&bl.fields.KEY_OPTION?' :: '+bl.fields.KEY_OPTION[0]:'')); }
  if (hats.length) console.log('  HATS(' + hats.length + '): ' + hats.join(' ; '));
}
