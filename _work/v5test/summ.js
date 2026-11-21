
const fs=require('fs');
const rows=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v5test/diff_res.json','utf8'));
const fail=rows.filter(r=>!r.same);
console.log('cases='+rows.length+' match='+(rows.length-fail.length)+' differ='+fail.length);
for(const r of fail){
  console.log('--- '+r.name);
  console.log('  mini: '+JSON.stringify(r.mini.out)+' err='+JSON.stringify(r.mini.err)+' status='+r.mini.status);
  console.log('  cpy : '+JSON.stringify(r.py.out)+' err='+JSON.stringify(r.py.err||''));
}
