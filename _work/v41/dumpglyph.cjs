// show glyph costume svg + geometry
// node _work/v41/dumpglyph.cjs <sb3> <char...>
const fs = require('fs');
const { zipRead } = require('../sb3lib.js');
const es = zipRead(process.argv[2]);
const P = JSON.parse(es.find((e) => e.name === 'project.json').data.toString('utf8'));
const T = P.targets.find((t) => t.name === 'TextRenderer');
const want = process.argv.slice(3);
for (const ch of want) {
  const c = T.costumes.find((x) => x.name === ch);
  if (!c) { console.log('no costume for ' + JSON.stringify(ch)); continue; }
  const e = es.find((x) => x.name === c.md5ext);
  const svg = e.data.toString('utf8');
  console.log('=== ' + JSON.stringify(ch) + '  rc=' + c.rotationCenterX + ',' + c.rotationCenterY + '  ' + c.md5ext);
  console.log(svg);
  console.log('');
}
