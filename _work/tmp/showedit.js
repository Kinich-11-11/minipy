const fs=require('fs');
const ops=fs.readFileSync('_work/tmp/ops.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
ops.sort((a,b)=>a.seq-b.seq);
const want=process.argv.slice(2).map(Number);
for(const o of ops){
  if(!want.includes(o.seq)) continue;
  const a=o.args||{};
  console.log('\n########## seq '+o.seq+'  '+(a.file_path||'').replace(/.*minipython./,'')+' ##########');
  console.log('--- OLD ---'); console.log(a.old_string);
  console.log('--- NEW ---'); console.log(a.new_string);
}
