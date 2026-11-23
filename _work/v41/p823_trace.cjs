const fs=require('fs'),path=require('path'),dir=__dirname;
const head=fs.readFileSync(path.join(dir,'head.txt'),'utf8').split('// ---- P1:')[0]
 .replace(/^const ROOT = .*;$/m,"const ROOT = path.resolve(__dirname, '../..');")
 .replace(/^const SRC = .*;$/m,"const SRC = process.env.V41_SRC || path.join(ROOT, 'MiniPy_v4.250.sb3');")
 .replace(/^const OUT = .*;$/m,"const OUT = process.env.V41_OUT || path.join(ROOT, '_work', 'v41', 'MiniPy_v4.250-p823-trace.sb3');")
 .replace(/^const OUT_JSON = .*;$/m,"const OUT_JSON = process.env.V41_JSON || path.join(__dirname, 'project250-p823-trace.json');")
 .replace(/^const STAMP = .*;$/m,"const STAMP = process.env.V41_STAMP || 'MiniPy v4.250 P823 fpop trace';");
const patch=String.raw`
patch('P823 trace fpop generator state',()=>{
  const v=n=>VAR(n); B.addList(IT,'P823Trace',[]);
  const d=inDef('calluser %s %s %s'); const fp=find(d,b=>b.opcode==='procedures_call'&&b.mutation?.proccode==='fpop');
  if(fp.length!==1)throw Error('[P823] fpop='+fp.length);
  const t=()=>JOIN(JOIN(JOIN(JOIN(JOIN(JOIN(JOIN(txt('g='),v('gmy')),txt(':r=')),v('grez')),txt(':y=')),v('gyld')),txt(':p=')),v('pc'));
  insertBeforeStmt(fp[0],[addTo('P823Trace',JOIN(txt('before:'),t()))]);
  spliceAfter(fp[0],addTo('P823Trace',JOIN(txt('after:'),t())));
  console.log('[P823] fpop trace installed '+fp[0]);
});
`;
const code=[head,patch,fs.readFileSync(path.join(dir,'tail.txt'),'utf8')].join('\n'); new Function(code); const Module=require('module'),m=new Module(path.join(dir,'build250-p823-trace.generated.js'),module);m.filename=path.join(dir,'build250-p823-trace.generated.js');m.paths=module.paths;m._compile(code,m.filename);

