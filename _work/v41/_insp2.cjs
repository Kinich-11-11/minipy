const fs=require('fs');
const P=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const t=P.targets.find(t=>/Interp/i.test(t.name));
const B=t.blocks;
let cur='u{D+XWks4M}MduE=Fkpb';
let n=0;
while(cur&&n<12){ const x=B[cur]; console.log(cur, x.opcode, JSON.stringify(x.inputs).slice(0,300)); cur=x.next; n++; }
