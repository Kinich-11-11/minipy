
const fs=require('fs');
const p=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const t=p.targets.find(x=>x.name==='Renderer');
const pats=['<','\\text','\\begin','font-family','is-strong','father','KaTeX','box'];
for(const pat of pats){
  let n=0; const ex=[];
  for(const id in t.blocks){ const b=t.blocks[id]; const s=JSON.stringify(b); if(s.includes(pat)){ n++; if(ex.length<3) ex.push(b.opcode+' '+s.slice(0,160)); } }
  console.log(pat+' -> '+n+(ex.length?('\n   '+ex.join('\n   ')):''));
}
// top-level hats already known; print comments with their block linkage
console.log('comments:');
for(const c of Object.values(t.comments||{})) console.log('  ['+(c.blockId?'attached':'free')+'] '+String(c.text).replace(/\n/g,' / ').slice(0,300));
