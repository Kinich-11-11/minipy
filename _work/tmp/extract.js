const fs=require('fs');
const lines=fs.readFileSync(process.argv[2],'utf8').split('\n').filter(Boolean);
const out=[];
for(const ln of lines){
  let ev; try{ ev=JSON.parse(ln);}catch(e){continue;}
  if(ev.type!=='tool/code-dispatch-start') continue;
  const d=ev.data||{};
  out.push({seq:ev.seq, time:ev.time, name:d.name, args:d.arguments, sub:d.subCallId});
}
fs.writeFileSync(process.argv[3], out.map(o=>JSON.stringify(o)).join('\n'));
console.log('ops', out.length);
const byName={};
for(const o of out) byName[o.name]=(byName[o.name]||0)+1;
console.log(JSON.stringify(byName,null,1));
