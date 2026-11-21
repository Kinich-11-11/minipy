
const fs=require('fs');
const dir=process.argv[2];
const exp=JSON.parse(fs.readFileSync(dir+'\\expected.json','utf8'));
const cases=JSON.parse(fs.readFileSync(dir+'\\cases.json','utf8'));
const load=(f)=>{ try{ return JSON.parse(fs.readFileSync(dir+'\\'+f,'utf8')).results; }catch(e){ return null; } };
const srcs={ 'PI131': load('res_pi.json'), 'v4.1': load('res_v41.json'), 'v4': load('res_v4.json') };
const norm=(arr)=>{ const a=(arr||[]).map(x=>String(x)); while(a.length&&a[a.length-1]==='')a.pop(); return a; };
const joined=(arr)=>norm(arr).join('\n');
const rows=[];
for(const c of cases){
  const e=exp[c.name]; const eo=norm(e.out); const ej=eo.join('\n');
  const row={name:c.name, py: ej + (e.err?(' !!'+e.err.split(':')[0]):'')};
  for(const k in srcs){
    const r=(srcs[k]||[]).find(x=>x.name===c.name);
    if(!r){ row[k]='?'; continue; }
    const o=norm(r.out);
    const oj=o.join('\n');
    let mark;
    if(oj===ej) mark='OK';
    else if(oj.replace(/\s+/g,'')===ej.replace(/\s+/g,'')) mark='OK*';
    else mark='DIFF';
    row[k]=mark+' '+JSON.stringify(o).slice(0,110)+(r.err&&r.err!=='0'&&r.err!==''?(' ERR='+String(r.err).slice(0,40)):'');
  }
  rows.push(row);
}
const w=(s,n)=>String(s).padEnd(n).slice(0,n);
console.log(w('case',17)+w('CPython',26)+w('PI 1.31',30)+'MiniPy v4.1');
console.log('-'.repeat(120));
for(const r of rows){
  console.log(w(r.name,17)+w(r.py,26)+w(r['PI131'],30)+w(r['v4.1'],34));
}
console.log('');
console.log('=== v4 vs v4.1 ===');
for(const r of rows) console.log(w(r.name,17)+w(r['v4.1'],36)+r['v4']);
