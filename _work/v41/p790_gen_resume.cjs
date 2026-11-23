const fs=require('fs'),path=require('path'),dir=__dirname;
const head=fs.readFileSync(path.join(dir,'head.txt'),'utf8').split('// ---- P1:')[0]
 .replace(/^const ROOT = .*;$/m,"const ROOT = path.resolve(__dirname, '../..');")
 .replace(/^const SRC = .*;$/m,"const SRC = process.env.V41_SRC || path.join(ROOT, 'MiniPy_v4.247.sb3');")
 .replace(/^const OUT = .*;$/m,"const OUT = process.env.V41_OUT || path.join(ROOT, 'MiniPy_v4.249p-candidate.sb3');")
 .replace(/^const OUT_JSON = .*;$/m,"const OUT_JSON = process.env.V41_JSON || path.join(dir, 'project249p-candidate.json');")
 .replace(/^const STAMP = .*;$/m,"const STAMP = process.env.V41_STAMP || 'MiniPy v4.249p candidate - preserve list across fpop';");
const p790List=String.raw`
patch('P790 refresh list receiver after nested generator throw',()=>{
  const call=(p,...args)=>callProc(p,args),v=n=>VAR(n);
  const mc=inDef('methodcall %s %s');
  const branches=find(mc,b=>{
    if(b.opcode!=='control_if'||!b.inputs?.SUBSTACK)return false;
    const c=b.inputs.CONDITION, cid=c&&typeof c[1]==='string'?c[1]:null, cb=cid&&BL()[cid];
    return !!(cb&&cb.opcode==='operator_equals'&&JSON.stringify(cb).includes('append'));
  });
  if(branches.length!==1)throw Error('[P790] append branch count='+branches.length);
  const sub=BL()[branches[0]].inputs.SUBSTACK[1];
  const evs=[...reach(sub)].filter(id=>BL()[id]?.opcode==='procedures_call'&&BL()[id].mutation?.proccode==='eval %s %s');
  if(evs.length!==1)throw Error('[P790] append arg eval='+evs.length);
  const ev=evs[0], saved=BL()[ev].next, cleanup=saved&&BL()[saved].next;
  if(!saved||!cleanup)throw Error('[P790] append eval tail missing');
  // The nested throw mutates the plain-name receiver during eval. Refresh it
  // after MCSav's temporary restore, immediately before the method publishes.
  insertBeforeStmt(cleanup,[
    IF(AND(EQ(v('cselfrK'),txt('I')),NOT(EQ(v('cselfr'),txt('self')))),[
      call('lookup %s',v('cselfr')),
      IF(GT(v('found'),num(0)),[setV('xa',item('Values',v('found'))),setV('xb',item('Types',v('found')))])
    ])
  ]);
  console.log('[P790] post-eval list receiver refresh installed at '+cleanup);
});

`;
const code=[head,...['p785.txt','p786.txt','p787.txt','p788.txt','p789.txt','p801_cache_throw.patch.txt','p805_method_refresh.patch.txt'].map(p=>fs.readFileSync(path.join(dir,p),'utf8')),p790List,fs.readFileSync(path.join(dir,'tail.txt'),'utf8')].join('\n');
new Function(code);const Module=require('module');const m=new Module(path.join(dir,'build249.generated.js'));m.filename=path.join(dir,'build249.generated.js');m.paths=module.paths;m._compile(code,m.filename);





