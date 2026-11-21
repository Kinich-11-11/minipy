const fs=require('fs');
const ops=fs.readFileSync('_work/tmp/ops.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
ops.sort((a,b)=>a.seq-b.seq);
const lo=+process.argv[2], hi=+process.argv[3];
for(const o of ops){
  if(o.seq<lo||o.seq>hi) continue;
  const a=o.args||{};
  let d='';
  if(o.name==='write') d='W '+String(a.file_path).replace(/.*minipython./,'')+' len='+((a.content||'').length);
  else if(o.name==='edit') d='E '+String(a.file_path).replace(/.*minipython./,'')+' old='+JSON.stringify((a.old_string||'').slice(0,45));
  else if(o.name==='pwsh') d='P '+String(a.command||'').replace(/\n/g,' ').slice(0,150);
  else d=o.name+' '+JSON.stringify(a).slice(0,110);
  console.log(o.seq+'  '+d);
}
