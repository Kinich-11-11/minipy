// extract one entry from an .sb3 to stdout (text) or list entries
// node _work/v41/unzip1.cjs <sb3> [entryName]
const fs = require('fs');
const { zipRead } = require('../sb3lib.js');
const es = zipRead(process.argv[2]);
if (!process.argv[3]) { for (const e of es) console.log(e.name + '  ' + e.data.length); process.exit(0); }
const e = es.find((x) => x.name === process.argv[3]);
if (!e) { console.error('no such entry: ' + process.argv[3]); process.exit(1); }
process.stdout.write(e.data);
