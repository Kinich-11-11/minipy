const fs=require('fs'),path=require('path'),dir=__dirname;
const head=fs.readFileSync(path.join(dir,'head.txt'),'utf8').split('// ---- P1:')[0]
 .replace(/^const ROOT = .*;$/m,"const ROOT = path.resolve(__dirname, '../..');")
 .replace(/^const SRC = .*;$/m,"const SRC = process.env.V41_SRC || path.join(ROOT, 'MiniPy_v4.250.sb3');")
 .replace(/^const OUT = .*;$/m,"const OUT = process.env.V41_OUT || path.join(ROOT, '_work', 'v41', 'MiniPy_v4.250-p823-fpop-alias2.sb3');")
 .replace(/^const OUT_JSON = .*;$/m,"const OUT_JSON = process.env.V41_JSON || path.join(__dirname, 'project250-p823-fpop-alias2.json');")
 .replace(/^const STAMP = .*;$/m,"const STAMP = process.env.V41_STAMP || 'MiniPy v4.250 P823 fpop alias merge deferred';");
const patch=String.raw`
patch('P823 capture first generator alias before fpop',()=>{
  const v=n=>VAR(n); const call=(p,...args)=>callProc(p,args);
  const d=inDef('calluser %s %s %s'); const fp=find(d,b=>b.opcode==='procedures_call'&&b.mutation?.proccode==='fpop');
  if(fp.length!==1)throw Error('[P823] fpop='+fp.length);
  const gate=AND(GT(v('gmy'),num(0)),AND(EQ(v('grez'),num(1)),EQ(item('GHInject783',v('gmy')),num(0))));
  insertBeforeStmt(fp[0],[IF(gate,[call('p801capture')])]);
  console.log('[P823] capture before fpop; defer existing p811 restore');
});
`;
const code=[head,patch,fs.readFileSync(path.join(dir,'tail.txt'),'utf8')].join('\n');new Function(code);const Module=require('module'),m=new Module(path.join(dir,'build250-p823-fpop-alias2.generated.js'),module);m.filename=path.join(dir,'build250-p823-fpop-alias2.generated.js');m.paths=module.paths;m._compile(code,m.filename);
