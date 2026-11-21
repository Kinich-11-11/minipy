const fs = require('fs');
const lines = fs.readFileSync('_work/v41/p345.txt', 'utf8').split('\n');
const bad = /A1 ev=\[|A2 fn=\[|A3 ev=\[/;
const kept = lines.filter((l) => !bad.test(l));
console.log('removed ' + (lines.length - kept.length) + ' broken probe line(s)');
fs.writeFileSync('_work/v41/p345.txt', kept.join('\n'));