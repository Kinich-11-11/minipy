
const fs=require('fs');
function load(f){return JSON.parse(fs.readFileSync(process.argv[2]+'\\'+f,'utf8'));}
function stats(file,label,targetName){
  const p=load(file);
  const t=p.targets.find(x=>x.name===targetName);
  if(!t){ console.log(label+': no target '+targetName); return; }
  const lists=new Set(Object.values(t.lists||{}).map(x=>x[0]));
  const vars=Object.values(t.variables||{}).map(x=>x[0]).filter(n=>!lists.has(n));
  const auto=vars.filter(n=>n.includes(':'));
  const plain=vars.filter(n=>!n.includes(':'));
  console.log('### '+label+'  ('+targetName+')');
  console.log('  scalar vars: '+vars.length+'   auto-generated (含冒号): '+auto.length+'   "real": '+plain.length);
  console.log('  real names ('+plain.length+'): '+plain.join(' '));
  console.log('');
}
stats('MiniPy_v4_now.json','MiniPy_v4.sb3 (04:34)','Interpreter');
stats('MiniPy_v4.1.json','MiniPy_v4.1.sb3','Interpreter');
stats('py.json','Python解释器 1.31','Interpreter');