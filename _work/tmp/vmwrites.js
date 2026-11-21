const fs=require('fs');
const ops=fs.readFileSync('_work/tmp/ops.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
ops.sort((a,b)=>a.seq-b.seq);
for(const o of ops){
  const a=o.args||{};
  if((o.name==='write'||o.name==='edit') && (a.file_path||'').endsWith('vm.js')){
    const c=a.content!==undefined?a.content:a.new_string;
    console.log(o.name, 'seq', o.seq, 'len', (c||'').length, '| tail:', JSON.stringify((c||'').slice(-70)));
  }
}
