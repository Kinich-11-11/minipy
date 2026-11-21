const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const p=JSON.parse(zipRead(process.argv[2]).find(e=>e.name==='project.json').data.toString('utf8'));
const t=p.targets.find(t=>t.name==='Interpreter'); const b=t.blocks;
const byName={}; for(const k in t.variables) byName[t.variables[k][0]]=k;
const js=byName['jsroot'];
function label(id){ const bb=b[id]; if(!bb) return '?'; let s=bb.opcode;
  if(bb.fields.VARIABLE) s+=' '+bb.fields.VARIABLE[0];
  return s; }
// find the loads branch root
const hit=Object.keys(b).find(id=>JSON.stringify(b[id]).indexOf('loads|00000')>=0);
let cur=hit,g=0; while(cur&&b[cur].opcode!=='control_if'&&g++<60) cur=b[cur].parent;
let body=b[cur].inputs.SUBSTACK[1];
console.log('--- top level of the loads branch ---');
let y=body,n=0;
while(y&&n++<40){
  const bb=b[y]; let extra='';
  if(bb.fields.VARIABLE) extra=' '+bb.fields.VARIABLE[0];
  console.log(n, bb.opcode+extra);
  if(bb.opcode==='control_repeat_until' && n<6){
    let s2=bb.inputs.SUBSTACK[1], k=0;
    while(s2&&k++<20){ const b2=b[s2]; let e2=''; if(b2.fields.VARIABLE) e2=' '+b2.fields.VARIABLE[0];
      const isJs = b2.inputs && Object.values(b2.inputs).some(v=>v&&typeof v[1]==='string'&&b[v[1]]&&b[v[1]].fields&&b[v[1]].fields.VARIABLE&&b[v[1]].fields.VARIABLE[1]===js);
      console.log('    body',k,b2.opcode+e2, isJs?'  <== touches jsroot':'', b2.fields.VARIABLE&&b2.fields.VARIABLE[1]===js?' (jsroot)':''); s2=b2.next; }
  }
  y=bb.next;
}