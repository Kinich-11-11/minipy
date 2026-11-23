const fs=require('fs'),path=require('path'),dir=__dirname;
const head=fs.readFileSync(path.join(dir,'head.txt'),'utf8')
  .split('// ---- P1:')[0]
  .replace(/^const ROOT = .*;$/m,"const ROOT = path.resolve(__dirname, '../..');")
  .replace(/^const SRC = .*;$/m,"const SRC = process.env.V41_SRC || path.join(ROOT, 'MiniPy_v4.250.sb3');")
  .replace(/^const OUT = .*;$/m,"const OUT = process.env.V41_OUT || path.join(ROOT, 'MiniPy_v4.250-p823-after-fpop-candidate.sb3');")
  .replace(/^const OUT_JSON = .*;$/m,"const OUT_JSON = process.env.V41_JSON || path.join(__dirname, 'project250-p823-after-fpop-candidate.json');")
  .replace(/^const STAMP = .*;$/m,"const STAMP = process.env.V41_STAMP || 'MiniPy v4.250 P823 after-fpop outer list alias candidate';");
const p823=String.raw`
// P823 narrow candidate: preserve list aliases after the shared calluser fpop
// restores the outer frame.  This is intentionally limited to the post-fpop
// merge; it does not touch generator PC, throw, yield-from, or dict views.
patch('P823 restore outer list aliases after fpop',()=>{
 const v=n=>VAR(n), call=(p,...args)=>callProc(p,args);
 const repl=(list,idx,val)=>I('data_replaceitemoflist',{fields:B.LISTF(list),inputs:{INDEX:B.REP(idx,[4,'0']),ITEM:B.REP(val,[4,'0'])}});
 B.addList(IT,'P823LN',[]); B.addList(IT,'P823LV',[]);
 newVar('p823i',0); newVar('p823Pending',0); newVar('p823cur','');
 const cap=newProc('p823capture',[]);
 attachBody(cap.defId,[
  clearL('P823LN'),clearL('P823LV'),setV('p823i',num(1)),setV('p823Pending',num(1)),
  REPEATU(GT(v('p823i'),llen('Names')),[
   IF(EQ(item('Types',v('p823i')),txt('L')),[addTo('P823LN',item('Names',v('p823i'))),addTo('P823LV',item('Values',v('p823i')))]),
   chgV('p823i',num(1))
  ])
 ]);
 const rst=newProc('p823restore',[]);
 attachBody(rst.defId,[
  setV('p823i',num(1)),
  REPEATU(GT(v('p823i'),llen('P823LN')),[
   call('lookup %s',item('P823LN',v('p823i'))),
   IF(GT(v('found'),num(0)),[setV('p823cur',item('Values',v('found'))),repl('Values',v('found'),JOIN(v('p823cur'),item('P823LV',v('p823i'))))]),
   chgV('p823i',num(1))
  ])
 ]);
 const cu=inDef('calluser %s %s %s');
 const fp=find(cu,b=>b.opcode==='procedures_call'&&b.mutation?.proccode==='fpop');
 if(fp.length!==1)throw Error('[P823] fpop='+fp.length);
 const cond=AND(AND(EQ(item('FnKind',v('fi')),txt('G')),EQ(v('gnew'),num(0))),AND(EQ(v('gyld'),num(1)),EQ(item('GHyfOn',v('gmy')),num(0))));
 insertBeforeStmt(fp[0],[IF(cond,[call('p823capture')])]);
 // Critical difference from P821: restore only after fpop has rebuilt the outer frame.
 spliceAfter(fp[0],IF(EQ(v('p823Pending'),num(1)),[call('p823restore'),setV('p823Pending',num(0))]));
 console.log('[P823] capture before fpop; restore after fpop; fpop='+fp[0]);
});
`;
const code=[head,p823,fs.readFileSync(path.join(dir,'tail.txt'),'utf8')].join('\n');
new Function(code);const Module=require('module');const m=new Module(path.join(dir,'build250-p823-after-fpop.generated.js'),module);
m.filename=path.join(dir,'build250-p823-after-fpop.generated.js');m.paths=module.paths;m._compile(code,m.filename);
