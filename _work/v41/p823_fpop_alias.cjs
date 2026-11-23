const fs=require('fs'),path=require('path'),dir=__dirname;
const head=fs.readFileSync(path.join(dir,'head.txt'),'utf8').split('// ---- P1:')[0]
 .replace(/^const ROOT = .*;$/m,"const ROOT = path.resolve(__dirname, '../..');")
 .replace(/^const SRC = .*;$/m,"const SRC = process.env.V41_SRC || path.join(ROOT, 'MiniPy_v4.250.sb3');")
 .replace(/^const OUT = .*;$/m,"const OUT = process.env.V41_OUT || path.join(ROOT, '_work', 'v41', 'MiniPy_v4.250-p823-fpop-alias.sb3');")
 .replace(/^const OUT_JSON = .*;$/m,"const OUT_JSON = process.env.V41_JSON || path.join(__dirname, 'project250-p823-fpop-alias.json');")
 .replace(/^const STAMP = .*;$/m,"const STAMP = process.env.V41_STAMP || 'MiniPy v4.250 P823 fpop alias merge';");
const patch=String.raw`
patch('P823 merge aliases around generator fpop',()=>{
  const v=n=>VAR(n); const call=(p,...args)=>callProc(p,args);
  newVar('p823Pending',0);
  const d=inDef('calluser %s %s %s'); const fp=find(d,b=>b.opcode==='procedures_call'&&b.mutation?.proccode==='fpop');
  if(fp.length!==1)throw Error('[P823] fpop='+fp.length);
  const gate=AND(GT(v('gmy'),num(0)),EQ(v('grez'),num(1)));
  insertBeforeStmt(fp[0],[IF(gate,[call('p801capture'),setV('p823Pending',num(1))])]);
  spliceAfter(fp[0],IF(EQ(v('p823Pending'),num(1)),[call('p801restore'),setV('p811Pending',num(0)),setV('p823Pending',num(0))]));
  console.log('[P823] fpop alias merge gated by gmy/grez');
});
`;
const code=[head,patch,fs.readFileSync(path.join(dir,'tail.txt'),'utf8')].join('\n');new Function(code);const Module=require('module'),m=new Module(path.join(dir,'build250-p823-fpop-alias.generated.js'),module);m.filename=path.join(dir,'build250-p823-fpop-alias.generated.js');m.paths=module.paths;m._compile(code,m.filename);

