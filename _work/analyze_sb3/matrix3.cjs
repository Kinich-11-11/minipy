
const fs=require('fs');
const dir=process.argv[2];
const norm=(arr)=>{ const a=(arr||[]).map(x=>String(x)); while(a.length&&a[a.length-1]==='')a.pop(); return a; };
const pairs=[['cases.json','expected.json','res_pi.json','res_v4new.json'],['cases2.json','expected2.json','res2_pi.json','res2_v4new.json']];
const w=(s,n)=>String(s).padEnd(n).slice(0,n);
let tally={pi:0,mn:0,both:0,neither:0};
const lines=[];
for(const [cf,ef,pf,mf] of pairs){
  const cases=JSON.parse(fs.readFileSync(dir+'\\'+cf,'utf8'));
  const exp=JSON.parse(fs.readFileSync(dir+'\\'+ef,'utf8'));
  const pi=JSON.parse(fs.readFileSync(dir+'\\'+pf,'utf8')).results;
  const mn=JSON.parse(fs.readFileSync(dir+'\\'+mf,'utf8')).results;
  const get=(rs,n)=>{ const r=rs.find(x=>x.name===n); if(!r) return null; const o=norm(r.out); return {o, j:o.join('\\n')}; };
  lines.push(w('case',16)+w('CPython',30)+w('PI1.31',12)+w('MiniPy v4(04:34)',16)+'MiniPy output');
  lines.push('-'.repeat(130));
  for(const c of cases){
    const e=exp[c.name]; const eo=norm(e.out); const ej=eo.join('\\n');
    const p=get(pi,c.name), m=get(mn,c.name);
    const okOf=(x)=>{ if(!x) return false; if(x.j===ej) return true; if(x.j.replace(/\\s+/g,'')===ej.replace(/\\s+/g,'')) return true;
      // treat "Error: <ExcType>" as matching a CPython exception
      if(e.err && /Error/.test(x.j) && x.j.includes(e.err.split(':')[0])) return true;
      if(e.err && /Error/.test(x.j) && x.j.includes(e.err.split(':')[0].replace('Error',''))) return true;
      return false; };
    const po=okOf(p), mo=okOf(m);
    if(po&&mo) tally.both++; else if(po) tally.pi++; else if(mo) tally.mn++; else tally.neither++;
    const flag = (po?'P':'.')+(mo?'M':'.');
    lines.push(w(c.name,16)+w(JSON.stringify(eo).slice(0,28)+(e.err?(' !!'+e.err.split(':')[0]):''),30)+w(flag,12)+w(po?'OK':'DIFF',16)+JSON.stringify(m?m.o:null).slice(0,90));
  }
}
console.log(lines.join('\n'));
console.log('\nTALLY  only-PI-correct:',tally.pi,' both-correct:',tally.both,' only-MiniPy-correct:',tally.mn,' neither:',tally.neither);
