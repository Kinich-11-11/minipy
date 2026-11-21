'use strict';
const fs = require('fs');
const { zipRead } = require('../sb3lib.js');
const entries = zipRead('MiniPy_v4.31.sb3');
const j = JSON.parse(entries.find(e => /project\.json$/.test(e.name)).data.toString('utf8'));
const stage = j.targets.find(t => t.isStage);
console.log('stage costumes:', JSON.stringify(stage.costumes));
console.log('zip names sample:', entries.slice(0, 8).map(e => e.name).join(', '));
console.log('total entries:', entries.length);
const svgs = entries.filter(e => /\.svg$/.test(e.name));
console.log('svg count:', svgs.length);
const desk = svgs.find(e => e.name.startsWith(stage.costumes[0].assetId));
if (desk) {
  const text = desk.data.toString('utf8');
  console.log('desk svg bytes:', text.length);
  const hits = ['RUN', 'STEP', 'STOP', 'OVER', 'DEMO', 'HELP'];
  for (const h of hits) console.log('  contains ' + h + ': ' + text.includes(h));
  fs.writeFileSync('_work/v41/_desk.svg', text);
  console.log(text.slice(0, 600));
}
