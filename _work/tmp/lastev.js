const d=JSON.parse(require('fs').readFileSync('_work/tmp/sizeevents.json','utf8'));
const vm=d.events.filter(e=>e.file==='vm.js');
console.log('vm.js events:', vm.length);
for(const e of vm.slice(-14)) console.log('  seq',e.seq,e.what,e.from,'->',e.to);
console.log('\nlast 6 events overall:');
for(const e of d.events.slice(-6)) console.log('  seq',e.seq,e.file,e.what,e.from,'->',e.to);
console.log('\nedit failures:');
for(const f of d.efail) console.log('  seq',f.seq,f.p.replace(/.*v5./,''),f.why);
