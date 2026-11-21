const fs=require('fs');
const lines=fs.readFileSync(process.argv[2],'utf8').split('\n').filter(Boolean);
console.log('lines',lines.length);
const shapes={};
let uses=0;
const byPath=new Map();
function walk(o, cb){ if(!o||typeof o!=='object') return; if(Array.isArray(o)){o.forEach(x=>walk(x,cb));return;} cb(o); for(const k in o) walk(o[k],cb); }
for(const ln of lines){
  let ev; try{ ev=JSON.parse(ln);}catch(e){ continue; }
  shapes[ev.type]=(shapes[ev.type]||0)+1;
  walk(ev,(o)=>{
    if(o && o.type==='tool_use' && typeof o.name==='string'){
      uses++;
      const inp=o.input||{};
      const p=inp.file_path||inp.path;
      if(p && (o.name==='write'||o.name==='edit')){
        const key=o.name+' '+p;
        if(!byPath.has(key)) byPath.set(key,{n:0,bytes:0});
        const e=byPath.get(key); e.n++; e.bytes += (inp.content?inp.content.length:(inp.new_string?inp.new_string.length:0));
      }
    }
  });
}
console.log('tool_use total',uses);
console.log('event types',JSON.stringify(shapes));
const entries=[...byPath.entries()].filter(([k])=>k.includes('v5')||k.includes('build5')||k.includes('dsl')||k.includes('regalloc')||k.includes('kernel'));
entries.sort((a,b)=>b[1].bytes-a[1].bytes);
console.log('--- v5-related file ops:',entries.length);
for(const [k,v] of entries.slice(0,80)) console.log(`  ${k}  writes=${v.n} bytes=${v.bytes}`);
