
const fs = require('fs');
const base = 'D:/编程/scratch/ai/minipython/_work/cmp47/';
const V4 = JSON.parse(fs.readFileSync(base+'gap_v4.json','utf8')).results;
const V7 = JSON.parse(fs.readFileSync(base+'gap_v7.json','utf8')).results;
const M = new Map(V4.map(r=>[r.name,r]));
const join = a => a.join('');
const out=[];
for (const b of V7){
  const a = M.get(b.name); if(!a) continue;
  const af = a.err.trim().length>0, bf = b.err.trim().length>0;
  const same = join(a.out)===join(b.out) && af===bf;
  const verdict = same ? 'SAME' : (af && !bf ? 'V7-OK/V4-FAIL' : (!af && bf ? 'V7-FAIL/V4-OK' : (af&&bf ? 'BOTH-ERR' : 'DIFF')));
  out.push(verdict.padEnd(15) + ' ' + b.name.padEnd(24) + 'v4=' + JSON.stringify(join(a.out)).slice(0,70) + (a.err?' ERR['+a.err.slice(0,45)+']':'') + '  |  v7=' + JSON.stringify(join(b.out)).slice(0,70) + (b.err?' ERR['+b.err.slice(0,45)+']':''));
}
fs.writeFileSync(base+'gaps_compare.txt', out.join('\n'),'utf8');
console.log(out.join('\n'));
