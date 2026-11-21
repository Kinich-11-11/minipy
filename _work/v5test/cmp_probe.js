
const fs=require('fs');
function load(p){ const t=fs.readFileSync(p,'utf8'); const i=t.indexOf('[{'); return JSON.parse(t.slice(i>=0?i:t.indexOf('['))); }
let v5,v4;
try{ v5=load('D:/编程/scratch/ai/minipython/_work/v5test/probe_v5.txt'); }catch(e){ console.log('v5 parse fail', e.message); }
try{ v4=load('D:/编程/scratch/ai/minipython/_work/v5test/probe_v4.txt'); }catch(e){ console.log('v4 parse fail', e.message); }
if(!v5||!v4){ console.log(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v5test/probe_v5.txt','utf8').slice(0,500)); process.exit(0); }
const m4={}; for(const r of v4) m4[r.name]=r;
console.log('name | v5 out | v4 out');
for(const r of v5){
  const a=JSON.stringify(r.out), b=JSON.stringify((m4[r.name]||{}).out);
  const flag = a===b? '  ' : '≠ ';
  console.log(flag+r.name.padEnd(22)+' v5='+a+(r.err?(' ERR='+r.err):'') + (flag==='≠ '?('   v4='+b+((m4[r.name]||{}).err?(' ERR='+m4[r.name].err):'')):''));
}
