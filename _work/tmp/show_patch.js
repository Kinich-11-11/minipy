const fs=require('fs');
const ops=fs.readFileSync('_work/tmp/ops.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
ops.sort((a,b)=>a.seq-b.seq);
const names=process.argv.slice(2);
for(const n of names){
  const hits=ops.filter(o=>o.name==='write' && (o.args.file_path||'').endsWith('\\'+n));
  if(!hits.length){ console.log('### '+n+' NOT FOUND'); continue; }
  const last=hits[hits.length-1];
  console.log('\n########## '+n+' (seq '+last.seq+', '+hits.length+' writes, '+last.args.content.length+' bytes) ##########');
  console.log(last.args.content.slice(0,2000));
}
