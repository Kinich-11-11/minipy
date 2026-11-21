const fs=require('fs');
const lines=fs.readFileSync('_work/tmp/sess81.jsonl','utf8').split('\n').filter(Boolean);
let maxEv=0, maxEvType='';
const sizes=[];
for(const ln of lines){
  let ev; try{ ev=JSON.parse(ln);}catch(e){continue;}
  if(ln.length>maxEv){ maxEv=ln.length; maxEvType=ev.type+' seq'+ev.seq; }
  if(ev.type==='tool/code-dispatch-start' && ev.data && ev.data.name==='write'){
    const c=(ev.data.arguments||{}).content||'';
    sizes.push({seq:ev.seq, len:c.length, path:(ev.data.arguments||{}).file_path});
  }
}
sizes.sort((a,b)=>b.len-a.len);
console.log('largest JSONL event:', maxEv, maxEvType);
console.log('top 12 write payloads:');
for(const s of sizes.slice(0,12)) console.log('  seq',s.seq,'len',s.len, (s.path||'').replace(/.*minipython./,''));
console.log('writes with len>50000:', sizes.filter(s=>s.len>50000).length);
console.log('writes with len in [50000,60000]:', sizes.filter(s=>s.len>=50000&&s.len<60000).length);
