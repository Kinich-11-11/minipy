const {zipRead}=require('../sb3lib.js');const path=require('path');const p=JSON.parse(zipRead(path.resolve(__dirname,'../..','MiniPy_v4.250.sb3')).find(e=>e.name==='project.json').data.toString());const B=p.targets.find(t=>t.name==='Interpreter').blocks;
function ex(v){if(!Array.isArray(v))return JSON.stringify(v);if(typeof v[1]==='string'&&B[v[1]])return B[v[1]].opcode;if(v.length===2&&Array.isArray(v[1]))return ex(v[1]);return JSON.stringify(v);}
for(const [id,b] of Object.entries(B)){
 if(b.opcode==='procedures_call'&&b.mutation?.proccode==='send777 %s %s %s'){
  console.log('\nCALL',id,'parent',b.parent);let x=b.parent,chain=[];for(let i=0;x&&i<20;i++){const z=B[x];chain.push(x+' '+z?.opcode+' '+(z?.mutation?.proccode||''));x=z?.parent;}console.log(chain.join('\n'));
 }
}
