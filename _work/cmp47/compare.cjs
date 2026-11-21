
const fs = require('fs');
const base = 'D:/编程/scratch/ai/minipython/_work/cmp47/';
const V4 = JSON.parse(fs.readFileSync(base+'feat_v4.json','utf8')).results;
const V7 = JSON.parse(fs.readFileSync(base+'feat_v7.json','utf8')).results;
const M = new Map(V4.map(r=>[r.name,r]));
const join = a => a.join('');
const lines = [];
function cls(a,b){
  const ao = join(a.out), bo = join(b.out);
  const af = a.err.trim().length>0, bf = b.err.trim().length>0;
  if (af && !bf) return 'V7-OK/V4-FAIL';
  if (!af && bf) return 'V7-FAIL/V4-OK';
  if (af && bf) return ao===bo ? 'BOTH-FAIL-SAME' : 'BOTH-FAIL-DIFF';
  return ao===bo ? 'SAME' : 'DIFF';
}
const counts = {};
for (const b of V7){
  const a = M.get(b.name); if(!a) continue;
  const c = cls(a,b); counts[c]=(counts[c]||0)+1;
  lines.push(c.padEnd(16) + ' ' + b.name.padEnd(22) +
    '\n    v4 out=' + JSON.stringify(join(a.out)).slice(0,110) + '  err=' + JSON.stringify(a.err).slice(0,80) +
    '\n    v7 out=' + JSON.stringify(join(b.out)).slice(0,110) + '  err=' + JSON.stringify(b.err).slice(0,80));
}
const out = ['SUMMARY ' + JSON.stringify(counts), '', ...lines];
fs.writeFileSync(base+'compare.txt', out.join('\n'),'utf8');
console.log('SUMMARY ' + JSON.stringify(counts));
console.log(out.join('\n').slice(0, 11000));
