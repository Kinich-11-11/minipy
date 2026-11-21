const fs=require('fs');
const P=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
for (const t of P.targets) {
  const B=t.blocks;
  for(const [id,b] of Object.entries(B)){
    if(b.opcode==='procedures_definition'&&b.inputs.custom_block){
      const pr=B[b.inputs.custom_block[1]];
      if(pr.mutation&&pr.mutation.proccode==='fail %s'){
        console.log('=== target', t.name, 'def', id);
        let cur=b.next, n=0;
        while(cur&&n<12){ const x=B[cur]; console.log(' ', cur, x.opcode, JSON.stringify(x.inputs).slice(0,300)); cur=x.next; n++; }
      }
    }
  }
}
