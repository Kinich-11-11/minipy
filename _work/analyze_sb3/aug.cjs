
const fs=require('fs');
const p=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const ops=['+=','-=','*=','/=','//=','%=','**=','&=','|=','^=','>>=','<<=',':=','//','**','->','f"',"f'"];
const found={};
for(const t of p.targets) for(const id in t.blocks){ const b=t.blocks[id]; const s=JSON.stringify(b);
  for(const o of ops) if(s.includes('"'+o+'"')) { (found[o]=found[o]||[]).push(t.name+':'+b.opcode); } }
for(const k in found) console.log(k+' -> '+found[k].length+' e.g. '+found[k].slice(0,3).join(', '));
// token kinds
const t=p.targets.find(x=>x.name==='Interpreter');
const kinds=new Set();
for(const id in t.blocks){ const b=t.blocks[id]; if(b.opcode==='operator_equals'&&b.inputs&&b.inputs.OPERAND2&&Array.isArray(b.inputs.OPERAND2[1])&&String(b.inputs.OPERAND2[1][1]).match(/^[a-z_]{2,}$/)) kinds.add(b.inputs.OPERAND2[1][1]); }
console.log('\nstring literals compared in Interpreter (sample):', [...kinds].slice(0,200).join(' '));
