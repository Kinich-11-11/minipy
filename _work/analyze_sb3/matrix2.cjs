
const fs=require('fs');
const dir=process.argv[2];
const exp=JSON.parse(fs.readFileSync(dir+'\\expected2.json','utf8'));
const cases=JSON.parse(fs.readFileSync(dir+'\\cases2.json','utf8'));
const load=(f)=>{ try{ return JSON.parse(fs.readFileSync(dir+'\\'+f,'utf8')).results; }catch(e){ return null; } };
const srcs={ 'PI131': load('res2_pi.json'), 'v4': load('res2_v4.json') };
const norm=(arr)=>{ const a=(arr||[]).map(x=>String(x)); while(a.length&&a[a.length-1]==='')a.pop(); return a; };
const w=(s,n)=>String(s).padEnd(n).slice(0,n);
console.log(w('case',16)+w('CPython',30)+w('PI 1.31',40)+'MiniPy v4');
console.log('-'.repeat(140));
for(const c of cases){
  const e=exp[c.name]; const eo=norm(e.out); const ej=eo.join('\\n');
  const cells=[];
  for(const k of ['PI131','v4']){
    const r=(srcs[k]||[]).find(x=>x.name===c.name);
    if(!r){ cells.push('?'); continue; }
    const o=norm(r.out); const oj=o.join('\\n');
    const ok = (oj===ej) || (oj.replace(/\\s+/g,'')===ej.replace(/\\s+/g,''));
    cells.push((ok?'OK  ':'DIFF')+JSON.stringify(o).slice(0,95));
  }
  console.log(w(c.name,16)+w(JSON.stringify(eo).slice(0,28)+(e.err?(' !!'+e.err.split(':')[0]):''),30)+w(cells[0],40)+cells[1]);
}
