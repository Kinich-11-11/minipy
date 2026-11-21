const fs=require('fs'),cp=require('child_process');
function unzip(p, out){ fs.rmSync(out,{recursive:true,force:true}); fs.mkdirSync(out,{recursive:true});
  cp.execSync('powershell -NoProfile -Command "Expand-Archive -LiteralPath \''+p.replace(/'/g,"''")+'\' -DestinationPath \''+out.replace(/'/g,"''")+'\' -Force"',{stdio:'ignore'}); }
for (const [name,out] of [['MiniPy_v5.sb3','_work/tmp/a'],['MiniPy_v5.1.sb3','_work/tmp/b']]) {
  unzip(name,out);
  const txt=fs.readFileSync(out+'/project.json','utf8');
  const proj=JSON.parse(txt);
  const I=proj.targets.find(x=>x.name==='Interpreter');
  const sc=proj.targets.find(x=>x.name==='Controller'), tr=proj.targets.find(x=>x.name==='TextRenderer');
  console.log(name, '| bytes', fs.statSync(name).size, '| project.json', txt.length);
  console.log('   Interpreter blocks', Object.keys(I.blocks).length, 'vars', Object.keys(I.variables).length, 'lists', Object.keys(I.lists).length);
  console.log('   Controller', Object.keys(sc.blocks).length, '| TextRenderer', Object.keys(tr.blocks).length, 'costumes', tr.costumes.length);
  // hash of project.json for identity
  console.log('   sha256(project.json)', require('crypto').createHash('sha256').update(txt).digest('hex').slice(0,24));
}
const a=fs.readFileSync('_work/tmp/a/project.json','utf8'), b=fs.readFileSync('_work/tmp/b/project.json','utf8'), c=fs.readFileSync('_work/v5/project.json','utf8');
const h=s=>require('crypto').createHash('sha256').update(s).digest('hex').slice(0,24);
console.log('extracted _work/v5/project.json sha', h(c), 'len', c.length);
console.log('A==extracted?', a===c, ' B==extracted?', b===c);
