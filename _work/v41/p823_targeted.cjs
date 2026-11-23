const fs=require('fs'),path=require('path'),dir=__dirname;
const head=fs.readFileSync(path.join(dir,'head.txt'),'utf8').split('// ---- P1:')[0]
 .replace(/^const ROOT = .*;$/m,"const ROOT = path.resolve(__dirname, '../..');")
 .replace(/^const SRC = .*;$/m,"const SRC = process.env.V41_SRC || path.join(ROOT, 'MiniPy_v4.250.sb3');")
 .replace(/^const OUT = .*;$/m,"const OUT = process.env.V41_OUT || path.join(ROOT, '_work', 'v41', 'MiniPy_v4.250-p823-targeted.sb3');")
 .replace(/^const OUT_JSON = .*;$/m,"const OUT_JSON = process.env.V41_JSON || path.join(__dirname, 'project250-p823-targeted.json');")
 .replace(/^const STAMP = .*;$/m,"const STAMP = process.env.V41_STAMP || 'MiniPy v4.250 P823 targeted fresh-send alias merge';");
const patch=String.raw`
patch('P823 targeted fresh-send alias merge',()=>{
  const v=n=>VAR(n), a=n=>argOf(n), call=(p,...args)=>callProc(p,args);
  newVar('p823FreshRejected',0);
  const sd=inDef('send777 %s %s %s');
  const fresh=find(sd,b=>{
    if(b.opcode!=='control_if'||!b.inputs?.CONDITION)return false;
    const sub=b.inputs.SUBSTACK?.[1]; const s=sub ? JSON.stringify([...reach(sub)].map(id=>BL()[id])) : '';
    return s.includes("can't send non-None value to a just-started generator");
  });
  if(fresh.length!==1)throw Error('[P823] fresh guard='+fresh.length);
  prependStack(fresh[0],'SUBSTACK',setV('p823FreshRejected',num(1)));
  const cu=inDef('calluser %s %s %s'); const fp=find(cu,b=>b.opcode==='procedures_call'&&b.mutation?.proccode==='fpop');
  if(fp.length!==1)throw Error('[P823] fpop='+fp.length);
  const gate=AND(EQ(v('p823FreshRejected'),num(1)),AND(GT(v('gmy'),num(0)),AND(EQ(v('grez'),num(1)),EQ(item('GHInject783',v('gmy')),num(0)))));
  insertBeforeStmt(fp[0],[IF(gate,[call('p801capture')])]);
  spliceAfter(fp[0],IF(EQ(v('p823FreshRejected'),num(1)),[setV('p823FreshRejected',num(0))]));
  console.log('[P823] targeted capture enabled fresh='+fresh[0]+' fpop='+fp[0]);
});
`;
const code=[head,patch,fs.readFileSync(path.join(dir,'tail.txt'),'utf8')].join('\n');new Function(code);const Module=require('module'),m=new Module(path.join(dir,'build250-p823-targeted.generated.js'),module);m.filename=path.join(dir,'build250-p823-targeted.generated.js');m.paths=module.paths;m._compile(code,m.filename);

