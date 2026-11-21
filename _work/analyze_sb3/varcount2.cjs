
const fs=require('fs');
function load(f){return JSON.parse(fs.readFileSync(process.argv[2]+'\\'+f,'utf8'));}
function stats(file,label,targetName){
  const p=load(file);
  const t=p.targets.find(x=>x.name===targetName);
  const lists=new Set(Object.values(t.lists||{}).map(x=>x[0]));
  const vars=Object.values(t.variables||{}).map(x=>x[0]).filter(n=>!lists.has(n));
  const at= vars.filter(n=>/^@\d+$/.test(n));
  const colon=vars.filter(n=>n.includes(':'));
  const other=vars.filter(n=>!/^@\d+$/.test(n)&&!n.includes(':'));
  console.log('### '+label);
  console.log('  total scalar: '+vars.length);
  console.log('  @NNNN 自动临时: '+at.length);
  console.log('  proc:var 每过程局部: '+colon.length);
  console.log('  手写命名('+other.length+'): '+other.slice(0,120).join(' '));
  console.log('');
}
stats('MiniPy_v4_now.json','MiniPy_v4.sb3 (04:34) Interpreter','Interpreter');
stats('py.json','Python解释器 1.31 Interpreter','Interpreter');
