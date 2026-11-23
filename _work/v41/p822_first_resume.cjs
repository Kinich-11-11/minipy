const fs=require('fs'),path=require('path'),dir=__dirname;
const head=fs.readFileSync(path.join(dir,'head.txt'),'utf8').split('// ---- P1:')[0]
 .replace(/^const ROOT = .*;$/m,"const ROOT = path.resolve(__dirname, '../..');")
 .replace(/^const SRC = .*;$/m,"const SRC = process.env.V41_SRC || path.join(ROOT, 'MiniPy_v4.250.sb3');")
 .replace(/^const OUT = .*;$/m,"const OUT = process.env.V41_OUT || path.join(ROOT, '_work', 'v41', 'MiniPy_v4.250-p822-first-resume.sb3');")
 .replace(/^const OUT_JSON = .*;$/m,"const OUT_JSON = process.env.V41_JSON || path.join(__dirname, 'project250-p822-first-resume.json');")
 .replace(/^const STAMP = .*;$/m,"const STAMP = process.env.V41_STAMP || 'MiniPy v4.250 P822 first generator resume alias merge';");
const patch=String.raw`
patch('P822 merge list aliases across first generator resume',()=>{
  const gx=inDef('gxpull %s');
  const cu=find(gx,b=>b.opcode==='procedures_call'&&b.mutation?.proccode==='calluser %s %s %s');
  if(cu.length!==1) throw Error('[P822] gxpull calluser='+cu.length);
  const np=inDef('nextArgs785 %s'); const er=find(np,b=>b.opcode==='procedures_call'&&b.mutation?.proccode==='egRestore764'); if(er.length!==1) throw Error('[P822] nextArgs egRestore='+er.length);
  spliceAfter(cu[0],callProc('p801capture',[]));
  spliceAfter(er[0],callProc('p801restore',[]));
  console.log('[P822] capture after gxpull calluser; restore after nextPull egRestore');
});
`;
const code=[head,patch,fs.readFileSync(path.join(dir,'tail.txt'),'utf8')].join('\n');
new Function(code); const Module=require('module'),m=new Module(path.join(dir,'build250-p822-first-resume.generated.js'),module);m.filename=path.join(dir,'build250-p822-first-resume.generated.js');m.paths=module.paths;m._compile(code,m.filename);


