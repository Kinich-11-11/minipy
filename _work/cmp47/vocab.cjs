
const fs = require('fs');
const base = 'D:/编程/scratch/ai/minipython/_work/cmp47/';
const A = JSON.parse(fs.readFileSync(base+'v4/project.json','utf8'));
const B = JSON.parse(fs.readFileSync(base+'v7/project.json','utf8'));
const byName = P => Object.fromEntries(P.targets.map(t=>[t.name,t]));
function blob(P){ let s=''; for(const t of P.targets){ for(const id of Object.keys(t.blocks)){ const b=t.blocks[id]; if(!b||typeof b!=='object') continue;
  for(const [k,v] of Object.entries(b.fields||{})) if(typeof v[0]==='string') s+=' '+v[0];
  for(const [k,v] of Object.entries(b.inputs||{})){ const val=v[1]; if(Array.isArray(val)&&typeof val[1]==='string') s+=' '+val[1]; } } }
  return s.toLowerCase(); }
const A1 = blob(A), B1 = blob(B);
const vocab = {
 'ErrorTypes': ['zerodivisionerror','valueerror','typeerror','nameerror','indexerror','keyerror','attributeerror','syntaxerror','indentationerror','notimplementederror','assertionerror','stopiteration','runtimeerror','limiterror','overflowerror','recursionerror','unboundlocalerror','importerror'],
 'Statements': ['class ','try:','except','finally','raise','with ','as ','yield','lambda','global','nonlocal','del ','assert','import','from ','pass','break','continue'],
 'Builtins': ['print','input','len','range','int','float','str','bool','abs','max','min','sum','pow','round','ord','chr','list','dict','tuple','set','repr','enumerate','zip','divmod','sorted','reversed','map','filter','isinstance'],
 'Modules': ['math','json','time','random','os','sys','re','collections'],
 'MathMembers': ['sqrt','floor','ceil','fabs','factorial','gcd','pi','e|','sin','cos','tan','log','exp','hypot','trunc'],
 'StrMethods': ['upper','lower','strip','lstrip','rstrip','split','join','replace','find','rfind','startswith','endswith','format','isdigit','isalpha','isalnum','isspace','title','capitalize','zfill','ljust','rjust','splitlines','swapcase'],
 'ListMethods': ['append','extend','insert','remove','pop','clear','index','count','sort','reverse','copy'],
 'DictMethods': ['get','keys','values','items','update','setdefault','fromkeys'],
};
const out=[]; const p=(...x)=>out.push(x.join(' '));
for (const [grp, list] of Object.entries(vocab)){
  const hasA=[], hasB=[], onlyA=[], onlyB=[];
  for (const w of list){
    const rx = w.includes('|') ? new RegExp(w) : null;
    const inA = rx ? rx.test(A1) : A1.includes(w);
    const inB = rx ? rx.test(B1) : B1.includes(w);
    if (inA) hasA.push(w); if (inB) hasB.push(w);
    if (inA && !inB) onlyA.push(w); if (!inA && inB) onlyB.push(w);
  }
  p('## ' + grp + '  v4=' + hasA.length + '/' + list.length + '  v7=' + hasB.length + '/' + list.length);
  p('   v4 only: ' + JSON.stringify(onlyA));
  p('   v7 only: ' + JSON.stringify(onlyB));
  p('   neither : ' + JSON.stringify(list.filter(w=>!hasA.includes(w)&&!hasB.includes(w))));
}
fs.writeFileSync(base+'vocab.txt', out.join('\n'),'utf8');
console.log(out.join('\n'));
