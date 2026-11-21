// node stampof.cjs <a.sb3> [b.sb3 ...] : print the agent/meta stamp of each project
const fs = require('fs');
const { zipRead } = require('../sb3lib.js');
for (const f of process.argv.slice(2)) {
  try {
    const j = JSON.parse(zipRead(f).find((e) => e.name === 'project.json').data.toString('utf8'));
    console.log(f.replace(/.*[\\/]/, '') + ' :: ' + JSON.stringify(j.meta || j.targets[0].name));
  } catch (e) { console.log(f + ' :: ERR ' + e.message); }
}
