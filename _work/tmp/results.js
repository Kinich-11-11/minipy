const fs=require('fs');
const lines=fs.readFileSync('_work/tmp/sess81.jsonl','utf8').split('\n').filter(Boolean);
const want=process.argv.slice(2).map(Number);
const sub2seq={};
for(const ln of lines){ let ev; try{ev=JSON.parse(ln);}catch(e){continue;}
  if(ev.type==='tool/code-dispatch-start'&&want.includes(ev.seq)) sub2seq[ev.data.subCallId]=ev.seq; }
for(const ln of lines){ let ev; try{ev=JSON.parse(ln);}catch(e){continue;}
  if(ev.type==='tool/code-dispatch'&&sub2seq[ev.data.subCallId]!==undefined){
    const txt=(ev.data.content||[]).map(c=>c.text||'').join('');
    console.log('### seq '+sub2seq[ev.data.subCallId]+' isError='+ev.data.isError+' :: '+JSON.stringify(txt.slice(0,200)));
  } }
