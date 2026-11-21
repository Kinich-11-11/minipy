const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const proj = JSON.parse(zipRead(process.argv[2]).find(e=>e.name==='project.json').data.toString('utf8'));
const t = proj.targets.find(x=>x.name==='Interpreter');
const names = Object.values(t.lists || {}).map(v => v[0] !== undefined ? v[0] : v.name);
const counts = {};
for (const n of names) counts[n] = (counts[n] || 0) + 1;
const dupes = Object.keys(counts).filter(n => counts[n] > 1);
console.log('lists =', names.length, ' duplicates =', JSON.stringify(dupes));
console.log('has FnFlags =', names.indexOf('FnFlags') >= 0);
const ids = Object.keys(t.lists || {});
console.log('list ids sample =', ids.slice(0, 4).join(','));
for (const id of ids) { const v = t.lists[id]; if ((v[0] || v.name) === 'FnFlags') console.log('FnFlags id =', id, JSON.stringify(v)); }