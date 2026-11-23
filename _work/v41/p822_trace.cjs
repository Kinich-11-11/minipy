const fs=require('fs'),path=require('path'),dir=__dirname;
const head=fs.readFileSync(path.join(dir,'head.txt'),'utf8').split('// ---- P1:')[0]
 .replace(/^const ROOT = .*;$/m,"const ROOT = path.resolve(__dirname, '../..');")
 .replace(/^const SRC = .*;$/m,"const SRC = process.env.V41_SRC || path.join(ROOT, 'MiniPy_v4.250.sb3');")
 .replace(/^const OUT = .*;$/m,"const OUT = process.env.V41_OUT || path.join(ROOT, '_work', 'v41', 'MiniPy_v4.250-p822-trace.sb3');")
 .replace(/^const OUT_JSON = .*;$/m,"const OUT_JSON = process.env.V41_JSON || path.join(__dirname, 'project250-p822-trace.json');")
 .replace(/^const STAMP = .*;$/m,"const STAMP = process.env.V41_STAMP || 'MiniPy v4.250 P822 initial PC trace';");
const patch=String.raw`
patch('P822 trace generator initial PC',()=>{
  const v=n=>VAR(n), a=n=>argOf(n);
  B.addList(IT,'P822Trace',[]);
  const d=inDef('calluser %s %s %s');
  const sets=find(d,b=>b.opcode==='data_setvariableto'&&b.fields?.VARIABLE?.[0]==='pc');
  const valList=x=>{const v=BL()[x]?.inputs?.VALUE; const id=v&&typeof v[1]==='string'?v[1]:null; return id&&BL()[id]?.fields?.LIST?.[0]||''}; console.log('[P822] pc lists',sets.map(x=>valList(x))); const fnSet=sets.filter(x=>valList(x)==='FnStart');
  if(fnSet.length!==1) throw Error('[P822] FnStart pc sets='+fnSet.length);
  const gSet=sets.filter(x=>valList(x)==='GHpc');
  if(gSet.length!==1) throw Error('[P822] GHpc pc sets='+gSet.length);
  const fmt=(tag,pcExpr)=>JOIN(JOIN(JOIN(JOIN(txt(tag),txt(':pc=')),pcExpr),JOIN(txt(':code='),item('Code',pcExpr))),JOIN(txt(':gmy='),v('gmy')));
  spliceAfter(fnSet[0],addTo('P822Trace',fmt('fnstart',v('pc'))));
  spliceAfter(gSet[0],addTo('P822Trace',fmt('ghpc',v('pc'))));

  console.log('[P822] trace installed fnSet='+fnSet[0]+' ghSet='+gSet[0]);
});
`;
const code=[head,patch,fs.readFileSync(path.join(dir,'tail.txt'),'utf8')].join('\n');
new Function(code);
const Module=require('module'),m=new Module(path.join(dir,'build250-p822-trace.generated.js'),module);m.filename=path.join(dir,'build250-p822-trace.generated.js');m.paths=module.paths;m._compile(code,m.filename);





