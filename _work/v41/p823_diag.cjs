const fs=require('fs'),path=require('path'),dir=__dirname;
const head=fs.readFileSync(path.join(dir,'head.txt'),'utf8').split('// ---- P1:')[0]
 .replace(/^const ROOT = .*;$/m,"const ROOT = path.resolve(__dirname, '../..');")
 .replace(/^const SRC = .*;$/m,"const SRC = process.env.V41_SRC || path.join(ROOT, 'MiniPy_v4.250.sb3');")
 .replace(/^const OUT = .*;$/m,"const OUT = process.env.V41_OUT || path.join(ROOT, '_work', 'v41', 'MiniPy_v4.250-p823-diag.sb3');")
 .replace(/^const OUT_JSON = .*;$/m,"const OUT_JSON = process.env.V41_JSON || path.join(__dirname, 'project250-p823-diag.json');")
 .replace(/^const STAMP = .*;$/m,"const STAMP = process.env.V41_STAMP || 'MiniPy v4.250 P823 fpop state diagnostic';");
const patch=String.raw`
patch('P823 diagnose fpop outer recovery state',()=>{
 const v=n=>VAR(n); B.addList(IT,'P823Diag',[]);
 const d=inDef('calluser %s %s %s'); const fp=find(d,b=>b.opcode==='procedures_call'&&b.mutation?.proccode==='fpop');
 if(fp.length!==1)throw Error('[P823-DIAG] fpop='+fp.length);
 const s=(a,b)=>JOIN(a,b), t=(lab)=>{
   let x=txt(lab);
   for(const [k,z] of [['fi',v('fi')],['fk',item('FnKind',v('fi'))],['gmy',v('gmy')],['grez',v('grez')],['gnew',v('gnew')],['gyld',v('gyld')],['pc',v('pc')],['nh',llen('Names')],['nv',llen('Values')],['hyf',item('GHyfOn',v('gmy'))]]) x=s(s(x,txt(' '+k+'=')),z);
   return x;
 };
 insertBeforeStmt(fp[0],[addTo('P823Diag',t('before'))]);
 spliceAfter(fp[0],addTo('P823Diag',t('after')));
 console.log('[P823-DIAG] fpop trace installed '+fp[0]);
});
`;
const code=[head,patch,fs.readFileSync(path.join(dir,'tail.txt'),'utf8')].join('\n'); new Function(code); const Module=require('module'),m=new Module(path.join(dir,'build250-p823-diag.generated.js'),module);m.filename=path.join(dir,'build250-p823-diag.generated.js');m.paths=module.paths;m._compile(code,m.filename);